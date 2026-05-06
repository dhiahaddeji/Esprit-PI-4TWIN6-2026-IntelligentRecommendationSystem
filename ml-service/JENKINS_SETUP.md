# ML Service Jenkins CI/CD Setup Guide

This guide explains how to set up and configure Jenkins pipelines for the ML service.

## Overview

Two separate Jenkins pipeline files:

1. **Jenkinsfile.ci** - Continuous Integration (linting, testing, security, build)
2. **Jenkinsfile.cd** - Continuous Deployment (deploy to Render)

## Prerequisites

### Jenkins Plugins Required

Install these plugins in Jenkins:

1. **Pipeline** - For pipeline support
2. **Docker Pipeline** - For Docker commands
3. **Git** - For source control
4. **Credentials Binding** - For secure credential management
5. **Email Extension** - For email notifications (optional)

### System Requirements

- Jenkins server with Docker installed
- Python 3.11+ installed on Jenkins agent
- Access to Docker registry (Docker Hub, AWS ECR, etc.)
- Render account with API access

## Jenkins Credentials Setup

Go to Jenkins → Manage Jenkins → Credentials → Add Credentials

### 1. Docker Registry Credentials

**For Docker Hub:**
- **Kind:** Username with password
- **ID:** `docker-credentials`
- **Username:** Your Docker Hub username
- **Password:** Your Docker Hub password/token

**For Docker Registry URL:**
- **Kind:** Secret text
- **ID:** `docker-registry-url`
- **Secret:** `docker.io` (for Docker Hub) or your registry URL

### 2. Render API Credentials

**Render API Key:**
- **Kind:** Secret text
- **ID:** `render-api-key`
- **Secret:** Your Render API key (from Render Account Settings → API Keys)

**Render Service ID:**
- **Kind:** Secret text
- **ID:** `render-service-id`
- **Secret:** Your Render service ID (srv-xxxxx)

## Creating Jenkins Jobs

### CI Pipeline Job

1. Go to Jenkins Dashboard
2. Click "New Item"
3. Enter name: `ML-Service-CI`
4. Select "Pipeline"
5. Click "OK"

**Configure:**

**General:**
- Description: "ML Service Continuous Integration Pipeline"

**Build Triggers:**
- ☑ Poll SCM: `H/5 * * * *` (every 5 minutes)
- ☑ GitHub hook trigger for GITScm polling (if using GitHub webhooks)

**Pipeline:**
- Definition: Pipeline script from SCM
- SCM: Git
- Repository URL: Your repository URL
- Credentials: Your Git credentials
- Branch: `*/main`
- Script Path: `ml-service/Jenkinsfile.ci`

**Save**

### CD Pipeline Job

1. Go to Jenkins Dashboard
2. Click "New Item"
3. Enter name: `ML-Service-CD`
4. Select "Pipeline"
5. Click "OK"

**Configure:**

**General:**
- Description: "ML Service Continuous Deployment Pipeline"

**Build Triggers:**
- ☑ Build after other projects are built
  - Projects to watch: `ML-Service-CI`
  - Trigger only if build is stable

**Pipeline:**
- Definition: Pipeline script from SCM
- SCM: Git
- Repository URL: Your repository URL
- Credentials: Your Git credentials
- Branch: `*/main`
- Script Path: `ml-service/Jenkinsfile.cd`

**Save**

## Pipeline Workflow

### CI Pipeline (Jenkinsfile.ci)

**Stages:**

1. **Checkout** - Clone repository
2. **Setup Python Environment** - Create virtual environment and install dependencies
3. **Code Linting** (Parallel)
   - Black - Code formatting check
   - isort - Import sorting check
   - Flake8 - Style guide enforcement
4. **Run Tests** - Execute pytest test suite
5. **Code Coverage** - Generate coverage report (80% minimum)
6. **Security Scanning** (Parallel)
   - Safety - Dependency vulnerability scan
   - Bandit - Code security scan
7. **Build Docker Image** - Build Docker image
8. **Test Docker Image** - Start container and test health endpoint
9. **Archive Artifacts** - Save test reports and coverage

**Artifacts Generated:**
- HTML coverage report
- XML coverage report
- Security scan reports (JSON)

### CD Pipeline (Jenkinsfile.cd)

**Stages:**

1. **Checkout** - Clone repository
2. **Wait for CI** - Ensure CI completed
3. **Build Docker Image** - Build production image
4. **Push to Docker Registry** - Push to Docker Hub/registry
5. **Deploy to Render** - Trigger Render deployment via API
6. **Monitor Deployment** - Wait for deployment to complete
7. **Health Check** - Verify service is healthy
8. **Cleanup Docker Images** - Remove old images

**Notifications:**
- Email on success
- Email on failure

## Configuration

### Update Service URL

In `Jenkinsfile.cd`, update the service URL:

```groovy
def serviceUrl = "https://your-ml-service.onrender.com"
```

### Update Docker Registry

If not using Docker Hub, update in `Jenkinsfile.cd`:

```groovy
environment {
    DOCKER_REGISTRY = credentials('your-registry-url')
}
```

### Email Notifications

Update email recipients in `Jenkinsfile.cd`:

```groovy
to: 'your-email@example.com'
```

Or configure default recipients in Jenkins:
- Manage Jenkins → Configure System → Extended E-mail Notification

## Running the Pipelines

### Automatic Trigger

1. Push code to `main` branch
2. CI pipeline triggers automatically (via SCM polling or webhook)
3. If CI succeeds, CD pipeline triggers automatically
4. Service deploys to Render

### Manual Trigger

**CI Pipeline:**
1. Go to Jenkins → ML-Service-CI
2. Click "Build Now"

**CD Pipeline:**
1. Go to Jenkins → ML-Service-CD
2. Click "Build Now"

## Monitoring

### View Build Status

- Jenkins Dashboard shows build status
- Click on build number to view console output
- Check "Test Results" for test reports
- Check "Artifacts" for coverage reports

### View Deployment Status

- Check Render dashboard for deployment status
- Monitor Jenkins console output for deployment progress
- Health check confirms service is running

## Troubleshooting

### CI Pipeline Issues

**Python environment fails:**
```bash
# Ensure Python 3.11+ is installed on Jenkins agent
python3 --version
```

**Tests fail:**
```bash
# Run tests locally first
cd ml-service
pytest tests/ -v
```

**Coverage below 80%:**
- Add more tests to increase coverage
- Check coverage report in artifacts

**Docker build fails:**
- Verify Dockerfile is correct
- Check Docker is installed and running on Jenkins agent

### CD Pipeline Issues

**Docker push fails:**
- Verify Docker credentials are correct
- Check registry URL is correct
- Ensure you're logged in: `docker login`

**Render deployment fails:**
- Verify Render API key is valid
- Check Render service ID is correct
- Review Render dashboard for error logs

**Health check fails:**
- Verify service URL is correct
- Check Render logs for startup errors
- Ensure `/health` endpoint is working

## Security Best Practices

1. **Never commit credentials** - Use Jenkins credentials only
2. **Rotate API keys** - Regularly update Render API keys
3. **Use least privilege** - Give minimal permissions needed
4. **Monitor security scans** - Review Safety and Bandit reports
5. **Keep dependencies updated** - Regularly update requirements.txt

## Local Testing

Test pipelines locally before pushing:

### Test CI Steps

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Run linting
pip install black isort flake8
black --check .
isort --check-only .
flake8 .

# Run tests
pytest tests/ -v

# Check coverage
pytest tests/ --cov=. --cov-report=term
coverage report --fail-under=80

# Security scans
pip install safety bandit
safety check --file requirements.txt
bandit -r . -ll

# Build Docker image
docker build -t ml-service:test .

# Test Docker image
docker run -d -p 8000:8000 --name ml-test ml-service:test
sleep 15
curl http://localhost:8000/health
docker stop ml-test
docker rm ml-test
```

### Test CD Steps

```bash
# Build image
docker build -t ml-service:latest .

# Tag for registry
docker tag ml-service:latest your-username/ml-service:latest

# Push to registry
docker login
docker push your-username/ml-service:latest

# Test Render API (replace with your credentials)
curl -X POST "https://api.render.com/v1/services/srv-xxxxx/deploys" \
  -H "Authorization: Bearer rnd_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": false}'
```

## Maintenance

### Update Python Version

In `Jenkinsfile.ci`:
```groovy
environment {
    PYTHON_VERSION = '3.12'  // Update version
}
```

### Update Coverage Threshold

In `Jenkinsfile.ci`:
```bash
coverage report --fail-under=85  // Change from 80 to 85
```

### Add New Test Stages

Add new stages in `Jenkinsfile.ci`:
```groovy
stage('Integration Tests') {
    steps {
        // Your integration test commands
    }
}
```

## Support

- **Jenkins Documentation:** https://www.jenkins.io/doc/
- **Docker Documentation:** https://docs.docker.com/
- **Render Documentation:** https://render.com/docs
- **Python Testing:** https://docs.pytest.org/

## Pipeline Status Badges

Add to your README.md:

```markdown
[![CI Pipeline](http://your-jenkins-url/buildStatus/icon?job=ML-Service-CI)](http://your-jenkins-url/job/ML-Service-CI/)
[![CD Pipeline](http://your-jenkins-url/buildStatus/icon?job=ML-Service-CD)](http://your-jenkins-url/job/ML-Service-CD/)
```

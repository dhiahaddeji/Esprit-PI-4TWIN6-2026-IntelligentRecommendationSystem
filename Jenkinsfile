pipeline {
    agent any

    tools {
        nodejs "nodejs"
    }

    environment {
        SONARQUBE = "sonarqube"
    }

    stages {

        stage('Clone') {
            steps {
                git 'https://github.com/dhiahaddeji/PI-FRONT.git'
            }
        }

        stage('Install') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv("${SONARQUBE}") {
                    sh '''
                    npx sonar-scanner \
                    -Dsonar.projectKey=frontend \
                    -Dsonar.sources=src \
                    -Dsonar.host.url=http://localhost:9000 \
                    -Dsonar.login=TON_TOKEN
                    '''
                }
            }
        }
    }
}
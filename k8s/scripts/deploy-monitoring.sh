#!/bin/bash
set -e

NAMESPACE=assurreco
MANIFESTS_DIR="$(dirname "$0")/../manifests/monitoring"

echo "==> Deploying Prometheus RBAC..."
kubectl apply -f "$MANIFESTS_DIR/prometheus/rbac.yaml"

echo "==> Deploying Prometheus..."
kubectl apply -f "$MANIFESTS_DIR/prometheus/configmap.yaml"
kubectl apply -f "$MANIFESTS_DIR/prometheus/pvc.yaml"
kubectl apply -f "$MANIFESTS_DIR/prometheus/deployment.yaml"
kubectl apply -f "$MANIFESTS_DIR/prometheus/service.yaml"

echo "==> Deploying AlertManager..."
kubectl apply -f "$MANIFESTS_DIR/alertmanager/configmap.yaml"
kubectl apply -f "$MANIFESTS_DIR/alertmanager/deployment.yaml"
kubectl apply -f "$MANIFESTS_DIR/alertmanager/service.yaml"

echo "==> Deploying Grafana..."
kubectl apply -f "$MANIFESTS_DIR/grafana/pvc.yaml"
kubectl apply -f "$MANIFESTS_DIR/grafana/configmap.yaml"
kubectl apply -f "$MANIFESTS_DIR/grafana/deployment.yaml"
kubectl apply -f "$MANIFESTS_DIR/grafana/service.yaml"

echo ""
echo "==> Waiting for pods to be ready..."
kubectl rollout status deployment/prometheus   -n $NAMESPACE --timeout=120s
kubectl rollout status deployment/alertmanager -n $NAMESPACE --timeout=60s
kubectl rollout status deployment/grafana      -n $NAMESPACE --timeout=60s

NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

echo ""
echo "✅  Monitoring stack deployed!"
echo "   Prometheus  → http://${NODE_IP}:30090"
echo "   AlertManager→ http://${NODE_IP}:30093"
echo "   Grafana     → http://${NODE_IP}:30031  (admin / assurreco2026)"

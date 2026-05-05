#!/bin/bash
# ============================================================
# deploy-all.sh — Déployer toute l'application sur le master
# Usage : bash deploy-all.sh
# ============================================================

set -e

MANIFESTS="$(dirname "$0")/../manifests"

echo "==> [1/5] Namespace"
kubectl apply -f "$MANIFESTS/namespace.yaml"

echo "==> [2/5] MongoDB"
kubectl apply -f "$MANIFESTS/mongodb/secret.yaml"
kubectl apply -f "$MANIFESTS/mongodb/pvc.yaml"
kubectl apply -f "$MANIFESTS/mongodb/statefulset.yaml"
kubectl apply -f "$MANIFESTS/mongodb/service.yaml"

echo "  Attente que MongoDB soit Ready..."
kubectl rollout status statefulset/mongodb -n assurreco --timeout=120s

echo "==> [3/5] Backend"
kubectl apply -f "$MANIFESTS/backend/configmap.yaml"
kubectl apply -f "$MANIFESTS/backend/secret.yaml"
kubectl apply -f "$MANIFESTS/backend/deployment.yaml"
kubectl apply -f "$MANIFESTS/backend/service.yaml"

echo "  Attente que Backend soit Ready..."
kubectl rollout status deployment/backend -n assurreco --timeout=120s

echo "==> [4/5] Frontend"
kubectl apply -f "$MANIFESTS/frontend/configmap.yaml"
kubectl apply -f "$MANIFESTS/frontend/deployment.yaml"
kubectl apply -f "$MANIFESTS/frontend/service.yaml"

echo "  Attente que Frontend soit Ready..."
kubectl rollout status deployment/frontend -n assurreco --timeout=120s

echo ""
echo "==> [5/5] État du cluster"
kubectl get all -n assurreco

echo ""
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "✅ Application déployée !"
echo "   Frontend  → http://${NODE_IP}:30080"
echo "   Backend   → http://${NODE_IP}:30300"

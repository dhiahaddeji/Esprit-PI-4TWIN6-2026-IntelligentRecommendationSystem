#!/bin/bash
# ============================================================
# setup-worker.sh — À exécuter sur chaque WORKER
# Passez la commande "kubeadm join ..." en argument
# Usage : sudo bash setup-worker.sh "<kubeadm join ...>"
# ============================================================

set -e

JOIN_CMD="$*"

if [ -z "$JOIN_CMD" ]; then
  echo "❌ Erreur : fournissez la commande kubeadm join en argument."
  echo "   Exemple : sudo bash setup-worker.sh \\"
  echo "     \"kubeadm join 192.168.x.x:6443 --token xxx --discovery-token-ca-cert-hash sha256:yyy\""
  exit 1
fi

echo "==> Rejoindre le cluster..."
eval "$JOIN_CMD" --cri-socket unix:///run/containerd/containerd.sock

echo ""
echo "✅ Worker joint au cluster. Vérifiez sur le master : kubectl get nodes"

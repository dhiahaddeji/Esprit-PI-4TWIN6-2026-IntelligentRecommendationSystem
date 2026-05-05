#!/bin/bash
# ============================================================
# setup-master.sh — À exécuter UNIQUEMENT sur le noeud master
# Ubuntu Server 22.04
# ============================================================

set -e

MASTER_IP="${1:-$(hostname -I | awk '{print $1}')}"
POD_CIDR="192.168.0.0/16"   # Calico default

echo "==> [1/5] Initialiser le cluster kubeadm"
kubeadm init \
  --apiserver-advertise-address="$MASTER_IP" \
  --pod-network-cidr="$POD_CIDR" \
  --cri-socket unix:///run/containerd/containerd.sock \
  | tee /root/kubeadm-init.log

echo "==> [2/5] Configurer kubectl pour l'utilisateur courant"
mkdir -p "$HOME/.kube"
cp /etc/kubernetes/admin.conf "$HOME/.kube/config"
chown "$(id -u):$(id -g)" "$HOME/.kube/config"

echo "==> [3/5] Installer Calico CNI (réseau des pods)"
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.3/manifests/calico.yaml

echo "==> [4/5] Attendre que les noeuds soient Ready"
echo "  (peut prendre 2-3 minutes...)"
kubectl wait --for=condition=Ready nodes --all --timeout=180s || true

echo "==> [5/5] Générer la commande kubeadm join"
echo ""
echo "════════════════════════════════════════════════════════"
echo "  Copiez et exécutez cette commande sur chaque WORKER :"
echo "════════════════════════════════════════════════════════"
kubeadm token create --print-join-command
echo "════════════════════════════════════════════════════════"
echo ""
echo "✅ Master prêt. kubectl get nodes pour vérifier."

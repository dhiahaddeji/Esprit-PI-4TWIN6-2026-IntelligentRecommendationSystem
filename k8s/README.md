# Kubernetes — AssurReco

Cluster kubeadm : 1 master + 2 workers (VirtualBox / Ubuntu 22.04)

---

## Architecture VirtualBox

| VM        | Rôle    | IP (host-only) | CPU | RAM  |
|-----------|---------|----------------|-----|------|
| k8s-master | Master  | 192.168.56.10  | 2   | 2 Go |
| k8s-worker1 | Worker | 192.168.56.11  | 2   | 2 Go |
| k8s-worker2 | Worker | 192.168.56.12  | 2   | 2 Go |

> Adaptez les IPs selon votre configuration réseau VirtualBox.

---

## Étape 1 — Créer les VMs VirtualBox

Pour chaque VM (Ubuntu Server 22.04 ISO) :
- **Réseau** : Adaptateur 1 = NAT (internet), Adaptateur 2 = Host-Only (192.168.56.x)
- Attribuez l'IP statique dans `/etc/netplan/` après installation

Exemple netplan (`/etc/netplan/00-installer-config.yaml`) :
```yaml
network:
  ethernets:
    enp0s3:          # NAT
      dhcp4: true
    enp0s8:          # Host-only
      dhcp4: false
      addresses: [192.168.56.10/24]   # .11 et .12 pour les workers
  version: 2
```
```bash
sudo netplan apply
```

---

## Étape 2 — Setup commun (tous les noeuds)

```bash
# Sur master, worker1, worker2
sudo bash k8s/scripts/setup-common.sh
sudo reboot
```

---

## Étape 3 — Initialiser le master

```bash
# Sur k8s-master uniquement
sudo bash k8s/scripts/setup-master.sh 192.168.56.10
```

À la fin, la commande affiche un `kubeadm join ...`. **Copiez-la.**

---

## Étape 4 — Rejoindre les workers

```bash
# Sur k8s-worker1 ET k8s-worker2
sudo bash k8s/scripts/setup-worker.sh "kubeadm join 192.168.56.10:6443 --token xxx --discovery-token-ca-cert-hash sha256:yyy"
```

Vérification depuis le master :
```bash
kubectl get nodes   # les 3 noeuds doivent être Ready
```

---

## Étape 5 — Configurer les secrets

Éditez avant de déployer :

```bash
# Mots de passe MongoDB
nano k8s/manifests/mongodb/secret.yaml

# Clés JWT, GitHub OAuth, Gmail
nano k8s/manifests/backend/secret.yaml

# URLs (IP master ou LoadBalancer)
nano k8s/manifests/backend/configmap.yaml
```

---

## Étape 6 — Déployer l'application

```bash
# Sur le master
bash k8s/scripts/deploy-all.sh
```

---

## Accès

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://192.168.56.10:30080   |
| Backend  | http://192.168.56.10:30300   |
| MongoDB  | interne uniquement (ClusterIP) |

---

## Commandes utiles

```bash
# État de tous les pods
kubectl get all -n assurreco

# Logs backend
kubectl logs -n assurreco -l app=backend --tail=50

# Logs MongoDB
kubectl logs -n assurreco -l app=mongodb --tail=50

# Redémarrer un déploiement
kubectl rollout restart deployment/backend -n assurreco

# Mettre à jour l'image (après docker push)
kubectl set image deployment/backend backend=dhiahaddeji/pi-back:latest -n assurreco
kubectl set image deployment/frontend frontend=dhiahaddeji/pi-front:latest -n assurreco
```

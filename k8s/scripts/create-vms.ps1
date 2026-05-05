# create-vms.ps1 - Creer les 3 VMs VirtualBox pour Kubernetes
# Executer en PowerShell administrateur

# ---- A ADAPTER -------------------------------------------------------
$IsoPath    = "C:\Users\MSI\Desktop\ubuntu-22.04.5-desktop-amd64.iso"
$VmsBaseDir = "C:\VMs\k8s"
$VBoxManage = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
# ----------------------------------------------------------------------

$VMs = @(
    @{ Name = "k8s-master";  RAM = 2048; CPU = 2 },
    @{ Name = "k8s-worker1"; RAM = 2048; CPU = 2 },
    @{ Name = "k8s-worker2"; RAM = 2048; CPU = 2 }
)

# Verifications
if (-not (Test-Path $VBoxManage)) {
    Write-Host "ERREUR: VBoxManage introuvable - $VBoxManage" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $IsoPath)) {
    Write-Host "ERREUR: ISO introuvable - $IsoPath" -ForegroundColor Red
    Write-Host "Telechargez Ubuntu Server 22.04 ici :" -ForegroundColor Yellow
    Write-Host "https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso" -ForegroundColor Yellow
    exit 1
}

# Reseau Host-Only
Write-Host "`n==> Configuration reseau Host-Only (192.168.56.0/24)" -ForegroundColor Cyan
$existingNets = & $VBoxManage list hostonlyifs
if ($existingNets -notmatch "192\.168\.56") {
    & $VBoxManage hostonlyif create | Out-Null
    $ifLine = & $VBoxManage list hostonlyifs | Select-String "^Name:"
    $ifName = ($ifLine | Select-Object -Last 1).ToString() -replace "^Name:\s+", ""
    & $VBoxManage hostonlyif ipconfig $ifName --ip 192.168.56.1 --netmask 255.255.255.0
    Write-Host "  Reseau cree : $ifName" -ForegroundColor Green
} else {
    $ifLine = & $VBoxManage list hostonlyifs | Select-String "^Name:"
    $ifName = ($ifLine | Select-Object -First 1).ToString() -replace "^Name:\s+", ""
    Write-Host "  Reseau existant : $ifName" -ForegroundColor Green
}

foreach ($vm in $VMs) {
    $name    = $vm.Name
    $ram     = $vm.RAM
    $cpu     = $vm.CPU
    $vmDir   = "$VmsBaseDir\$name"
    $vdiPath = "$vmDir\$name.vdi"

    Write-Host "`n==> $name ($cpu vCPU / ${ram} Mo RAM)" -ForegroundColor Cyan

    # Supprimer si existe deja
    $existing = & $VBoxManage list vms | Select-String "`"$name`""
    if ($existing) {
        Write-Host "  Suppression de l'ancienne VM $name..." -ForegroundColor Yellow
        & $VBoxManage unregistervm $name --delete
    }

    New-Item -ItemType Directory -Force -Path $vmDir | Out-Null

    # Creer la VM
    & $VBoxManage createvm --name $name --ostype Ubuntu_64 --register --basefolder $VmsBaseDir

    # CPU / RAM / boot
    & $VBoxManage modifyvm $name --memory $ram --cpus $cpu --ioapic on --boot1 dvd --boot2 disk

    # Reseau : NIC1=NAT, NIC2=Host-Only
    & $VBoxManage modifyvm $name --nic1 nat
    & $VBoxManage modifyvm $name --nic2 hostonly --hostonlyadapter2 $ifName

    # Disque dur 20 Go sur controleur SATA
    & $VBoxManage createmedium disk --filename $vdiPath --size 20480 --format VDI
    & $VBoxManage storagectl $name --name SATA --add sata --controller IntelAhci --portcount 2
    & $VBoxManage storageattach $name --storagectl SATA --port 0 --device 0 --type hdd --medium $vdiPath

    # ISO Ubuntu sur port SATA 1
    & $VBoxManage storageattach $name --storagectl SATA --port 1 --device 0 --type dvddrive --medium $IsoPath

    Write-Host "  $name : OK" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " 3 VMs creees avec succes !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "PROCHAINE ETAPE - Installer Ubuntu sur chaque VM :"
Write-Host "  1. Ouvrez VirtualBox"
Write-Host "  2. Demarrez k8s-master  -> hostname: k8s-master,  IP statique: 192.168.56.10"
Write-Host "  3. Demarrez k8s-worker1 -> hostname: k8s-worker1, IP statique: 192.168.56.11"
Write-Host "  4. Demarrez k8s-worker2 -> hostname: k8s-worker2, IP statique: 192.168.56.12"
Write-Host ""
Write-Host "Pendant l'install Ubuntu, reseau sur enp0s8 :"
Write-Host "  Subnet: 192.168.56.0/24  |  Gateway: (vide)  |  DNS: 8.8.8.8"
Write-Host ""
Write-Host "Ensuite : sudo bash setup-common.sh sur chaque VM, puis setup-master.sh sur le master."

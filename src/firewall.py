import socket
import sys
from scapy.all import *

# Define allowed IPs (whitelist)
ALLOWED_IPS = ["192.168.1.1", "10.0.0.2"]

def packet_handler(packet):
    if IP in packet:
        src_ip = packet[IP].src
        dst_ip = packet[IP].dst
        
        # Block traffic from non-whitelisted IPs
        if src_ip not in ALLOWED_IPS:
            print(f"🚨 Blocked packet from {src_ip} to {dst_ip}")
            return  # Drop the packet
        else:
            print(f"✅ Allowed packet from {src_ip} to {dst_ip}")

# Start sniffing traffic
try:
    print("🔥 Firewall started. Monitoring traffic...")
    sniff(prn=packet_handler, filter="ip", store=0)
except KeyboardInterrupt:
    print("🛑 Firewall stopped.")
    sys.exit(0)
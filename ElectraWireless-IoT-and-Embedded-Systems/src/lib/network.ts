export async function getLocalSubnet(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
      
      pc.onicecandidate = (ice) => {
        if (ice && ice.candidate && ice.candidate.candidate) {
          const match = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
          if (match) {
            const ip = match[1];
            // 192.168.1.150 -> 192.168.1
            const parts = ip.split(".");
            parts.pop(); 
            pc.close();
            resolve(parts.join("."));
            return;
          }
        }
      };
      
      // Fallback
      setTimeout(() => {
        pc.close();
        resolve(null);
      }, 1500);
    } catch (e) {
      resolve(null);
    }
  });
}

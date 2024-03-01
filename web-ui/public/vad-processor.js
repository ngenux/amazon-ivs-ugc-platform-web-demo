class VADProcessor extends AudioWorkletProcessor {
    process(inputs) {
      const input = inputs[0];
      let isTalking = false;
  
      if (input.length > 0) {
        const channelData = input[0];
        let sum = 0;
  
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] ** 2;
        }
        let rms = Math.sqrt(sum / channelData.length);
  
       
        isTalking = rms > 0.02; 
      }
  
      
      this.port.postMessage({ isTalking });
  
      return true;
    }
  }
  
  registerProcessor('vad-processor', VADProcessor);
  
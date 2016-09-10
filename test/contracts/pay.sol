contract PayContract {
    uint8 version = 1;
    address dest;
    address vendor;
    uint16 net;
    
    function PayContract(uint16 _fee, address _dest, string t, bytes32 b, bool kj) {
        net = 1000 - _fee;
        dest = _dest;
        vendor = msg.sender;
    }
    
    function getDest() constant returns (address) {
        return dest;
    }
    
    function getVerson() constant returns (uint8) {
      return version;
    }
    
    function() {
        dest.send((msg.value / 1000) * net);
        vendor.send(this.balance);
    }
}
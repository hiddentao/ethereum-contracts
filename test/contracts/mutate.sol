contract Mutate {
  uint16 _internal = 0;
  
  function getInternal() constant returns (uint16) {
    return _internal;
  }
  
  function increment(uint16 _amount) returns (string, uint16) {
    _internal += _amount;
    
    return ("newValue", _internal);
  }
}
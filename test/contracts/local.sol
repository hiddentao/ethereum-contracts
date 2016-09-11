contract Local {
  function getZero() {
    
  }

  function getOne(uint8 val) returns (uint8) {
    return val;
  }
  
  function getTwo(string s, address a) returns (string, address) {
    return (s, a);
  }
}
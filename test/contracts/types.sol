contract Types {
  int8 _int8;
  uint8 _uint8;
  address _address;
  string _string;
  bytes32 _bytes32; 
  bool _bool;
  bytes _bytes;

  function set_int8(int8 val) returns (int8) {
    _int8 = val;
    
    return val;
  }

  function set_uint8(uint8 val) returns (uint8) {
    _uint8 = val;

    return val;
  }

  function set_address(address val) returns (address) {
    _address = val;

    return val;
  }

  function set_string(string val) returns (string) {
    _string = val;

    return val;
  }

  function set_bool(bool val) returns (bool) {
    _bool = val;

    return val;
  }

  function set_bytes32(bytes32 val) returns (bytes32) {
    _bytes32 = val;

    return val;
  }

}


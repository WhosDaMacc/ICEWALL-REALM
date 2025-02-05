echo "
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract IceToken is ERC20, Ownable {
    constructor() public ERC20('Ice Token', 'ICE') {
        _mint(msg.sender, 1_000 * 10**18);
    }

    function mint(address to, uint256 amount) external onlyOwner returns (bool){
       require(amount >0,"Amount must be greater than zero.");
        
         _mint(to ,amount);
         
        return true;
 }
}" >> contracts/IceToken.sol
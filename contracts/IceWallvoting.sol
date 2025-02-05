// contracts/IceWallVoting.sol
// Your Ice Wall Voting contract code
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract IceWallVoting is Ownable {
    struct Vote {
        uint256 value;
        uint256 timestamp;
    }

    mapping(address => Vote) public userVotes;

    event Voted(address indexed user, uint256 value, uint256 timestamp);

    function vote(address user, uint256 value) external onlyOwner {
        userVotes[user] = Vote(value, block.timestamp);
        emit Voted(user, value, block.timestamp);
    }

    function getVote(address user) external view returns (uint256) {
        return userVotes[user].value;
    }
}
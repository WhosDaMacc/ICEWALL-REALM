// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IceToken.sol"; // Ensure this is correctly imported
import "./Navitar.sol"; // Ensure your Navitar contract is linked

contract FightSystem is Ownable {
    IceToken public iceToken;
    Navitar public navitarContract;

    event FightInitiated(address indexed player1, address indexed player2, uint256 fightId);
    event FightResult(address indexed winner, address indexed loser, uint256 fightId, uint256 reward);

    struct Fight {
        address player1;
        address player2;
        address winner;
        bool completed;
    }

    uint256 public fightCount;
    mapping(uint256 => Fight) public fights;
    uint256 public rewardAmount = 50 * 10**18; // 50 $ICE tokens

    constructor(address _iceToken, address _navitarContract) {
        iceToken = IceToken(_iceToken);
        navitarContract = Navitar(_navitarContract);
    }

    function initiateFight(address opponent) external {
        require(opponent != msg.sender, "You cannot fight yourself");

        fightCount++;
        fights[fightCount] = Fight(msg.sender, opponent, address(0), false);

        emit FightInitiated(msg.sender, opponent, fightCount);
    }

    function resolveFight(uint256 fightId, address winner) external onlyOwner {
        require(fights[fightId].completed == false, "Fight already resolved");

        fights[fightId].winner = winner;
        fights[fightId].completed = true;

        iceToken.mint(winner, rewardAmount);

        emit FightResult(winner, fights[fightId].player1 == winner ? fights[fightId].player2 : fights[fightId].player1, fightId, rewardAmount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC20 {
    function mint(address to, uint256 amount) external;
}

contract IceWallFightSystem {
    struct Navitar {
        uint256 wins;
        uint256 losses;
    }

    struct Battle {
        address player1;
        address player2;
        bool active;
    }

    mapping(address => Navitar) public navitars;
    mapping(uint256 => Battle) public battles;
    uint256 public battleCounter;

    IERC20 public iceToken;

    event FightInitiated(uint256 indexed battleId, address indexed player1, address indexed player2);
    event FightResolved(uint256 indexed battleId, address winner, address loser);
    
    constructor(address _iceTokenAddress) {
        iceToken = IERC20(_iceTokenAddress);
    }

    // **Users initiate fights against other players**
    function initiateFight(address opponent) external {
        require(opponent != msg.sender, "Cannot fight yourself");

        battles[battleCounter] = Battle({
            player1: msg.sender,
            player2: opponent,
            active: true
        });

        emit FightInitiated(battleCounter, msg.sender, opponent);
        battleCounter++;
    }

    // **Fight system selects a winner and distributes rewards**
    function resolveFight(uint256 battleId) external {
        Battle storage battle = battles[battleId];
        require(battle.active, "Battle already resolved");

        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))) % 100;
        address winner = (randomNumber % 2 == 0) ? battle.player1 : battle.player2;
        address loser = (winner == battle.player1) ? battle.player2 : battle.player1;

        navitars[winner].wins += 1;
        navitars[loser].losses += 1;

        battle.active = false;

        // **Reward the winner with $ICE tokens**
        distributeReward(winner);

        emit FightResolved(battleId, winner, loser);
    }

    // **Function to distribute $ICE token rewards**
    function distributeReward(address winner) internal {
        uint256 rewardAmount = 50 * 10**18; // Example: 50 $ICE tokens
        iceToken.mint(winner, rewardAmount);
    }
}
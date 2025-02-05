// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract IceWallFightSystem is Ownable, VRFConsumerBase {
    using Counters for Counters.Counter;
    
    struct Navitar {
        uint256 id;
        uint256 attackPower;
        uint256 defensePower;
        uint256 health;
        uint256 agility;
        uint256 wins;
        uint256 losses;
    }

    struct Battle {
        address player1;
        address player2;
        uint256 navitar1;
        uint256 navitar2;
        bool active;
    }

    mapping(address => Navitar) public navitars;
    mapping(uint256 => Battle) public battles;
    Counters.Counter private battleCounter;

    event FightInitiated(address indexed challenger, address indexed opponent, uint256 battleId);
    event FightResolved(uint256 battleId, address winner, address loser);

    constructor(address _vrfCoordinator, address _linkToken)
        VRFConsumerBase(_vrfCoordinator, _linkToken)
    {}

    function registerNavitar(uint256 attack, uint256 defense, uint256 health, uint256 agility) external {
        require(navitars[msg.sender].id == 0, "Navitar already registered");
        uint256 newId = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp)));
        navitars[msg.sender] = Navitar(newId, attack, defense, health, agility, 0, 0);
    }

    function initiateFight(address opponent) external {
        require(navitars[msg.sender].id != 0, "You must register a Navitar");
        require(navitars[opponent].id != 0, "Opponent must have a Navitar");

        battleCounter.increment();
        uint256 battleId = battleCounter.current();

        battles[battleId] = Battle(msg.sender, opponent, navitars[msg.sender].id, navitars[opponent].id, true);
        emit FightInitiated(msg.sender, opponent, battleId);
    }

    function resolveFight(uint256 battleId) external {
        Battle storage battle = battles[battleId];
        require(battle.active, "Battle already resolved");

        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))) % 100;
        address winner = (randomNumber % 2 == 0) ? battle.player1 : battle.player2;
        address loser = (winner == battle.player1) ? battle.player2 : battle.player1;

        navitars[winner].wins += 1;
        navitars[loser].losses += 1;

        battle.active = false;
        emit FightResolved(battleId, winner, loser);
    }
}
// NavitarFight.sol
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NavitarFight is Ownable {
    struct Fight {
        address player1;
        address player2;
        uint256 navitar1;
        uint256 navitar2;
        bool active;
        uint256 startTime;
        uint256 rewardPool;
    }

    IERC721 public navitarNFT;
    IERC20 public iceToken;

    mapping(address => uint256) public playerReputation;
    mapping(uint256 => Fight) public ongoingFights;
    uint256 public nextFightId;

    event FightInvited(address indexed player1, address indexed player2, uint256 fightId);
    event FightStarted(uint256 fightId, address indexed player1, address indexed player2);
    event FightEnded(uint256 fightId, address winner, uint256 reward);
    event EnvironmentalChallenge(address indexed player, uint256 navitarId);

    constructor(address _navitarNFT, address _iceToken) {
        navitarNFT = IERC721(_navitarNFT);
        iceToken = IERC20(_iceToken);
    }

    function sendFightInvite(address player2, uint256 navitar1, uint256 rewardPool) external {
        require(player2 != msg.sender, "Cannot challenge yourself");
        require(navitarNFT.ownerOf(navitar1) == msg.sender, "Not your Navitar");
        require(iceToken.transferFrom(msg.sender, address(this), rewardPool), "Reward transfer failed");

        uint256 fightId = nextFightId++;
        ongoingFights[fightId] = Fight({
            player1: msg.sender,
            player2: player2,
            navitar1: navitar1,
            navitar2: 0,
            active: false,
            startTime: block.timestamp,
            rewardPool: rewardPool
        });

        emit FightInvited(msg.sender, player2, fightId);
    }

    function acceptFightInvite(uint256 fightId, uint256 navitar2) external {
        Fight storage fight = ongoingFights[fightId];
        require(fight.player2 == msg.sender, "Not invited");
        require(navitarNFT.ownerOf(navitar2) == msg.sender, "Not your Navitar");

        fight.navitar2 = navitar2;
        fight.active = true;
        emit FightStarted(fightId, fight.player1, fight.player2);
    }

    function endFight(uint256 fightId, address winner) external onlyOwner {
        Fight storage fight = ongoingFights[fightId];
        require(fight.active, "Fight not active");
        require(winner == fight.player1 || winner == fight.player2, "Invalid winner");

        address loser = (winner == fight.player1) ? fight.player2 : fight.player1;
        playerReputation[winner] += 10;
        playerReputation[loser] = (playerReputation[loser] > 5) ? playerReputation[loser] - 5 : 0;

        iceToken.transfer(winner, fight.rewardPool);
        fight.active = false;
        emit FightEnded(fightId, winner, fight.rewardPool);
    }

    function spawnRandomChallenge(address player, uint256 navitarId) external onlyOwner {
        require(navitarNFT.ownerOf(navitarId) == player, "Invalid Navitar");
        uint256 challengeChance = uint256(keccak256(abi.encodePacked(block.timestamp, player))) % 100;
        
        if (challengeChance < 20) {
            emit EnvironmentalChallenge(player, navitarId);
        }
    }
}
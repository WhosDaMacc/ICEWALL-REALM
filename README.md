# ICEWALL-REALM
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IceWallVoting is AccessControl {
    IERC20 public iceToken;
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    struct UserProfile {
        uint256 reputation;
        uint256 votesReceived;
        mapping(address => uint256) lastVoteTime;
    }

    mapping(address => UserProfile) public profiles;

    uint256 public voteCooldown = 7 days;
    uint256 public baseVoteWeight = 1 * 1e18; // Default 1 $ICE per vote
    uint256 public quadraticScale = 2; // Quadratic cost scaling factor
    uint256 public rewardThreshold = 100; // Reputation needed for rewards
    uint256 public rewardAmount = 50 * 1e18; // $ICE reward for reaching threshold

    event Voted(address indexed voter, address indexed target, int256 voteValue, uint256 weight);
    event ReputationRewarded(address indexed user, uint256 reward);
    
    constructor(address _iceToken) {
        iceToken = IERC20(_iceToken);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier canVote(address _target) {
        require(_target != msg.sender, "You cannot vote for yourself");
        require(block.timestamp >= profiles[msg.sender].lastVoteTime[_target] + voteCooldown, "Cooldown active");
        _;
    }

    function vote(address _target, bool _upvote, uint256 iceSpent) external canVote(_target) {
        require(iceSpent >= baseVoteWeight, "Minimum 1 $ICE required to vote");
        iceToken.transferFrom(msg.sender, address(this), iceSpent);

        uint256 weight = iceSpent / baseVoteWeight; // Base weight calculation
        weight = weight ** quadraticScale; // Quadratic scaling

        int256 voteValue = _upvote ? int256(weight) : -int256(weight);
        profiles[_target].reputation += uint256(int256(profiles[_target].reputation) + voteValue);
        profiles[_target].votesReceived += weight;
        profiles[msg.sender].lastVoteTime[_target] = block.timestamp;

        emit Voted(msg.sender, _target, voteValue, weight);

        if (profiles[_target].reputation >= rewardThreshold) {
            iceToken.transfer(_target, rewardAmount);
            emit ReputationRewarded(_target, rewardAmount);
        }
    }

    function getReputation(address _user) external view returns (uint256) {
        return profiles[_user].reputation;
    }

    function setVotingRules(uint256 _cooldown, uint256 _baseVoteWeight, uint256 _quadraticScale, uint256 _rewardThreshold, uint256 _rewardAmount) external onlyRole(DAO_ROLE) {
        voteCooldown = _cooldown;
        baseVoteWeight = _baseVoteWeight;
        quadraticScale = _quadraticScale;
        rewardThreshold = _rewardThreshold;
        rewardAmount = _rewardAmount;
    }
}
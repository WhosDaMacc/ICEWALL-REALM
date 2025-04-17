// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BusinessProfile is Ownable {
    struct Business {
        string name;
        string description;
        address owner;
        uint256[] realmIds;
        uint256 reputation;
        uint256[] eventIds;
        bool verified;
        string category;
        string location;
    }

    struct Event {
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 maxParticipants;
        address[] participants;
        bool active;
    }

    mapping(address => Business) public businesses;
    mapping(uint256 => Event) public events;
    mapping(address => bool) public isBusiness;
    mapping(address => uint256[]) public businessEvents;
    mapping(uint256 => address) public eventToBusiness;

    uint256 public eventCounter;
    IERC20 public iceToken;

    event BusinessRegistered(address indexed businessAddress, string name);
    event EventCreated(uint256 indexed eventId, address indexed businessAddress, string title);
    event EventParticipated(uint256 indexed eventId, address indexed participant);
    event BusinessVerified(address indexed businessAddress);
    event ReputationUpdated(address indexed businessAddress, uint256 newReputation);

    constructor(address _iceToken) {
        iceToken = IERC20(_iceToken);
    }

    function registerBusiness(
        string memory _name,
        string memory _description,
        string memory _category,
        string memory _location
    ) external {
        require(!isBusiness[msg.sender], "Business already registered");
        
        Business memory newBusiness = Business({
            name: _name,
            description: _description,
            owner: msg.sender,
            realmIds: new uint256[](0),
            reputation: 0,
            eventIds: new uint256[](0),
            verified: false,
            category: _category,
            location: _location
        });

        businesses[msg.sender] = newBusiness;
        isBusiness[msg.sender] = true;

        emit BusinessRegistered(msg.sender, _name);
    }

    function createEvent(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _maxParticipants
    ) external {
        require(isBusiness[msg.sender], "Not a registered business");
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");

        uint256 eventId = eventCounter++;
        Event memory newEvent = Event({
            title: _title,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            maxParticipants: _maxParticipants,
            participants: new address[](0),
            active: true
        });

        events[eventId] = newEvent;
        businessEvents[msg.sender].push(eventId);
        eventToBusiness[eventId] = msg.sender;
        businesses[msg.sender].eventIds.push(eventId);

        emit EventCreated(eventId, msg.sender, _title);
    }

    function joinEvent(uint256 _eventId) external {
        require(events[_eventId].active, "Event is not active");
        require(block.timestamp < events[_eventId].endTime, "Event has ended");
        require(events[_eventId].participants.length < events[_eventId].maxParticipants, "Event is full");
        
        for (uint256 i = 0; i < events[_eventId].participants.length; i++) {
            require(events[_eventId].participants[i] != msg.sender, "Already participating");
        }

        events[_eventId].participants.push(msg.sender);
        emit EventParticipated(_eventId, msg.sender);
    }

    function verifyBusiness(address _businessAddress) external onlyOwner {
        require(isBusiness[_businessAddress], "Not a registered business");
        businesses[_businessAddress].verified = true;
        emit BusinessVerified(_businessAddress);
    }

    function updateReputation(address _businessAddress, uint256 _newReputation) external onlyOwner {
        require(isBusiness[_businessAddress], "Not a registered business");
        businesses[_businessAddress].reputation = _newReputation;
        emit ReputationUpdated(_businessAddress, _newReputation);
    }

    function getBusinessEvents(address _businessAddress) external view returns (uint256[] memory) {
        return businessEvents[_businessAddress];
    }

    function getEventParticipants(uint256 _eventId) external view returns (address[] memory) {
        return events[_eventId].participants;
    }
} 
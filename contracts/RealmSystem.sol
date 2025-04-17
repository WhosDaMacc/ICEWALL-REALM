// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract RealmSystem is Ownable {
    struct Realm {
        string name;
        address creator;
        address[] businesses;
        uint256[] eventIds;
        bool active;
        string location;
        int256 latitude;
        int256 longitude;
        uint256 radius;
    }

    struct Interaction {
        address user;
        uint256 timestamp;
        string interactionType;
        string data;
    }

    mapping(uint256 => Realm) public realms;
    mapping(uint256 => Interaction[]) public realmInteractions;
    mapping(address => uint256[]) public userRealms;
    mapping(address => bool) public isRealmCreator;

    uint256 public realmCounter;

    event RealmCreated(uint256 indexed realmId, address indexed creator, string name);
    event BusinessAdded(uint256 indexed realmId, address indexed business);
    event InteractionRecorded(uint256 indexed realmId, address indexed user, string interactionType);
    event RealmDeactivated(uint256 indexed realmId);

    function createRealm(
        string memory _name,
        string memory _location,
        int256 _latitude,
        int256 _longitude,
        uint256 _radius
    ) external {
        uint256 realmId = realmCounter++;
        Realm memory newRealm = Realm({
            name: _name,
            creator: msg.sender,
            businesses: new address[](0),
            eventIds: new uint256[](0),
            active: true,
            location: _location,
            latitude: _latitude,
            longitude: _longitude,
            radius: _radius
        });

        realms[realmId] = newRealm;
        userRealms[msg.sender].push(realmId);
        isRealmCreator[msg.sender] = true;

        emit RealmCreated(realmId, msg.sender, _name);
    }

    function addBusinessToRealm(uint256 _realmId, address _business) external {
        require(realms[_realmId].active, "Realm is not active");
        require(realms[_realmId].creator == msg.sender || owner() == msg.sender, "Not authorized");
        
        for (uint256 i = 0; i < realms[_realmId].businesses.length; i++) {
            require(realms[_realmId].businesses[i] != _business, "Business already in realm");
        }

        realms[_realmId].businesses.push(_business);
        emit BusinessAdded(_realmId, _business);
    }

    function recordInteraction(
        uint256 _realmId,
        string memory _interactionType,
        string memory _data
    ) external {
        require(realms[_realmId].active, "Realm is not active");
        
        Interaction memory newInteraction = Interaction({
            user: msg.sender,
            timestamp: block.timestamp,
            interactionType: _interactionType,
            data: _data
        });

        realmInteractions[_realmId].push(newInteraction);
        emit InteractionRecorded(_realmId, msg.sender, _interactionType);
    }

    function deactivateRealm(uint256 _realmId) external {
        require(
            realms[_realmId].creator == msg.sender || owner() == msg.sender,
            "Not authorized"
        );
        realms[_realmId].active = false;
        emit RealmDeactivated(_realmId);
    }

    function getRealmBusinesses(uint256 _realmId) external view returns (address[] memory) {
        return realms[_realmId].businesses;
    }

    function getRealmInteractions(uint256 _realmId) external view returns (Interaction[] memory) {
        return realmInteractions[_realmId];
    }

    function isLocationInRealm(
        uint256 _realmId,
        int256 _latitude,
        int256 _longitude
    ) external view returns (bool) {
        Realm memory realm = realms[_realmId];
        int256 latDiff = _latitude - realm.latitude;
        int256 longDiff = _longitude - realm.longitude;
        uint256 distance = uint256(latDiff * latDiff + longDiff * longDiff);
        return distance <= realm.radius * realm.radius;
    }
} 
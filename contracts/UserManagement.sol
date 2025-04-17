// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract UserManagement is Ownable, Pausable {
    enum AccountStatus {
        PENDING_VERIFICATION,
        ACTIVE,
        DISABLED,
        SUSPENDED
    }

    enum VerificationStatus {
        UNVERIFIED,
        EMAIL_VERIFIED,
        WALLET_VERIFIED,
        FULLY_VERIFIED
    }

    struct UserProfile {
        string email;
        string username;
        address walletAddress;
        AccountStatus status;
        VerificationStatus verificationStatus;
        uint256 createdAt;
        uint256 lastLogin;
        uint256[] navitarIds;
        uint256 reputation;
        bytes32 passwordHash;
        bytes32 resetToken;
        uint256 resetTokenExpiry;
    }

    mapping(address => UserProfile) public userProfiles;
    mapping(address => string) public walletToEmail;
    mapping(string => bool) public emailExists;
    mapping(address => bool) public isUser;

    event UserCreated(address indexed userAddress, string email, string username);
    event StatusUpdated(address indexed userAddress, AccountStatus newStatus);
    event VerificationUpdated(address indexed userAddress, VerificationStatus newStatus);
    event PasswordResetRequested(address indexed userAddress);
    event PasswordUpdated(address indexed userAddress);
    event LastLoginUpdated(address indexed userAddress, uint256 timestamp);

    modifier onlyActiveUser() {
        require(isUser[msg.sender], "User not registered");
        require(userProfiles[msg.sender].status == AccountStatus.ACTIVE, "User not active");
        _;
    }

    modifier onlyVerifiedUser() {
        require(
            userProfiles[msg.sender].verificationStatus == VerificationStatus.FULLY_VERIFIED,
            "User not verified"
        );
        _;
    }

    function createUserProfile(
        string memory _email,
        string memory _username,
        bytes32 _passwordHash
    ) external whenNotPaused {
        require(!isUser[msg.sender], "User already registered");
        require(!emailExists[_email], "Email already registered");

        UserProfile memory newProfile = UserProfile({
            email: _email,
            username: _username,
            walletAddress: msg.sender,
            status: AccountStatus.PENDING_VERIFICATION,
            verificationStatus: VerificationStatus.UNVERIFIED,
            createdAt: block.timestamp,
            lastLogin: block.timestamp,
            navitarIds: new uint256[](0),
            reputation: 0,
            passwordHash: _passwordHash,
            resetToken: bytes32(0),
            resetTokenExpiry: 0
        });

        userProfiles[msg.sender] = newProfile;
        walletToEmail[msg.sender] = _email;
        emailExists[_email] = true;
        isUser[msg.sender] = true;

        emit UserCreated(msg.sender, _email, _username);
    }

    function updateStatus(address _userAddress, AccountStatus _newStatus) external onlyOwner {
        require(isUser[_userAddress], "User not registered");
        userProfiles[_userAddress].status = _newStatus;
        emit StatusUpdated(_userAddress, _newStatus);
    }

    function verifyPassword(address _userAddress, bytes32 _passwordHash) external view returns (bool) {
        return userProfiles[_userAddress].passwordHash == _passwordHash;
    }

    function requestPasswordReset() external whenNotPaused {
        require(isUser[msg.sender], "User not registered");
        
        bytes32 resetToken = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            blockhash(block.number - 1)
        ));
        
        userProfiles[msg.sender].resetToken = resetToken;
        userProfiles[msg.sender].resetTokenExpiry = block.timestamp + 1 hours;
        
        emit PasswordResetRequested(msg.sender);
    }

    function resetPassword(bytes32 _resetToken, bytes32 _newPasswordHash) external whenNotPaused {
        require(isUser[msg.sender], "User not registered");
        require(
            userProfiles[msg.sender].resetToken == _resetToken,
            "Invalid reset token"
        );
        require(
            block.timestamp <= userProfiles[msg.sender].resetTokenExpiry,
            "Reset token expired"
        );

        userProfiles[msg.sender].passwordHash = _newPasswordHash;
        userProfiles[msg.sender].resetToken = bytes32(0);
        userProfiles[msg.sender].resetTokenExpiry = 0;

        emit PasswordUpdated(msg.sender);
    }

    function updateLastLogin() external onlyActiveUser {
        userProfiles[msg.sender].lastLogin = block.timestamp;
        emit LastLoginUpdated(msg.sender, block.timestamp);
    }

    function getUserProfile(address _userAddress) external view returns (UserProfile memory) {
        return userProfiles[_userAddress];
    }

    function addNavitarId(address _userAddress, uint256 _navitarId) external onlyOwner {
        require(isUser[_userAddress], "User not registered");
        userProfiles[_userAddress].navitarIds.push(_navitarId);
    }

    function updateReputation(address _userAddress, uint256 _newReputation) external onlyOwner {
        require(isUser[_userAddress], "User not registered");
        userProfiles[_userAddress].reputation = _newReputation;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
} 
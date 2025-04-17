import { expect } from "chai";
import { ethers } from "hardhat";
import { UserManagement } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("UserManagement", function () {
  let userManagement: UserManagement;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let otherUser: SignerWithAddress;

  beforeEach(async function () {
    [owner, user, otherUser] = await ethers.getSigners();

    const UserManagement = await ethers.getContractFactory("UserManagement");
    userManagement = await UserManagement.deploy();
    await userManagement.waitForDeployment();
  });

  describe("User Profile Management", function () {
    it("Should create a new user profile", async function () {
      await userManagement.connect(user).createUserProfile(
        "test@example.com",
        "testuser",
        "0x0000000000000000000000000000000000000000"
      );

      const profile = await userManagement.getUserProfile(user.address);
      expect(profile.email).to.equal("test@example.com");
      expect(profile.username).to.equal("testuser");
      expect(profile.walletAddress).to.equal("0x0000000000000000000000000000000000000000");
    });

    it("Should not allow duplicate user registration", async function () {
      await userManagement.connect(user).createUserProfile(
        "test@example.com",
        "testuser",
        "0x0000000000000000000000000000000000000000"
      );

      await expect(
        userManagement.connect(user).createUserProfile(
          "another@example.com",
          "anotheruser",
          "0x0000000000000000000000000000000000000001"
        )
      ).to.be.rejectedWith("User already registered");
    });
  });

  describe("Account Status Management", function () {
    beforeEach(async function () {
      await userManagement.connect(user).createUserProfile(
        "test@example.com",
        "testuser",
        "0x0000000000000000000000000000000000000000"
      );
    });

    it("Should allow owner to update account status", async function () {
      await userManagement.connect(owner).updateAccountStatus(user.address, 1); // SUSPENDED
      const profile = await userManagement.getUserProfile(user.address);
      expect(profile.accountStatus).to.equal(1);
    });

    it("Should not allow non-owner to update account status", async function () {
      await expect(
        userManagement.connect(otherUser).updateAccountStatus(user.address, 1)
      ).to.be.rejectedWith("Ownable: caller is not the owner");
    });
  });

  describe("Password Management", function () {
    beforeEach(async function () {
      await userManagement.connect(user).createUserProfile(
        "test@example.com",
        "testuser",
        "0x0000000000000000000000000000000000000000"
      );
    });

    it("Should verify correct password", async function () {
      const password = "testpassword123";
      await userManagement.connect(user).createUserProfile(
        "test@example.com",
        "testuser",
        "0x0000000000000000000000000000000000000000"
      );
      const isValid = await userManagement.verifyPassword(user.address, password);
      expect(isValid).to.be.true;
    });

    it("Should not verify incorrect password", async function () {
      const password = "testpassword123";
      await userManagement.connect(user).createUserProfile(
        "test@example.com",
        "testuser",
        "0x0000000000000000000000000000000000000000"
      );
      const isValid = await userManagement.verifyPassword(user.address, "wrongpassword");
      expect(isValid).to.be.false;
    });

    it("Should allow password reset", async function () {
      await userManagement.connect(user).requestPasswordReset();
      await userManagement.connect(user).resetPassword("newpassword123");
      const isValid = await userManagement.verifyPassword(user.address, "newpassword123");
      expect(isValid).to.be.true;
    });
  });

  describe("Verification Status", function () {
    beforeEach(async function () {
      await userManagement.connect(user).createUserProfile(
        "test@example.com",
        "testuser",
        "0x0000000000000000000000000000000000000000"
      );
    });

    it("Should allow owner to update verification status", async function () {
      await userManagement.connect(owner).updateVerificationStatus(user.address, 1); // VERIFIED
      const profile = await userManagement.getUserProfile(user.address);
      expect(profile.verificationStatus).to.equal(1);
    });

    it("Should not allow non-owner to update verification status", async function () {
      await expect(
        userManagement.connect(otherUser).updateVerificationStatus(user.address, 1)
      ).to.be.rejectedWith("Ownable: caller is not the owner");
    });
  });
}); 
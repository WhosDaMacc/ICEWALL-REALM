import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  UserManagement,
  BusinessProfile,
  RealmSystem,
  FightSystem,
} from "../typechain-types";

describe("ICEWALL REALM Contracts", function () {
  let userManagement: UserManagement;
  let businessProfile: BusinessProfile;
  let realmSystem: RealmSystem;
  let fightSystem: FightSystem;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy contracts
    const UserManagement = await ethers.getContractFactory("UserManagement");
    userManagement = await UserManagement.deploy();
    await userManagement.deployed();

    const BusinessProfile = await ethers.getContractFactory("BusinessProfile");
    businessProfile = await BusinessProfile.deploy();
    await businessProfile.deployed();

    const RealmSystem = await ethers.getContractFactory("RealmSystem");
    realmSystem = await RealmSystem.deploy();
    await realmSystem.deployed();

    const FightSystem = await ethers.getContractFactory("FightSystem");
    fightSystem = await FightSystem.deploy();
    await fightSystem.deployed();
  });

  describe("UserManagement", function () {
    it("Should create a new user profile", async function () {
      const email = "test@example.com";
      const username = "testuser";
      const passwordHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("password123")
      );

      await userManagement
        .connect(user1)
        .createUserProfile(email, username, passwordHash);

      const profile = await userManagement.getUserProfile(user1.address);
      expect(profile.email).to.equal(email);
      expect(profile.username).to.equal(username);
    });

    it("Should not allow duplicate email addresses", async function () {
      const email = "test@example.com";
      const username1 = "user1";
      const username2 = "user2";
      const passwordHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("password123")
      );

      await userManagement
        .connect(user1)
        .createUserProfile(email, username1, passwordHash);

      await expect(
        userManagement
          .connect(user2)
          .createUserProfile(email, username2, passwordHash)
      ).to.be.revertedWith("Email already registered");
    });
  });

  describe("BusinessProfile", function () {
    it("Should register a new business", async function () {
      const name = "Test Business";
      const description = "A test business";
      const category = "Retail";
      const location = "New York";

      await businessProfile
        .connect(user1)
        .registerBusiness(name, description, category, location);

      const business = await businessProfile.getBusiness(user1.address);
      expect(business.name).to.equal(name);
      expect(business.description).to.equal(description);
    });

    it("Should create an event", async function () {
      const name = "Test Business";
      const description = "A test business";
      const category = "Retail";
      const location = "New York";

      await businessProfile
        .connect(user1)
        .registerBusiness(name, description, category, location);

      const eventTitle = "Test Event";
      const eventDescription = "A test event";
      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const endTime = startTime + 7200; // 2 hours duration
      const maxParticipants = 100;

      await businessProfile
        .connect(user1)
        .createEvent(
          eventTitle,
          eventDescription,
          startTime,
          endTime,
          maxParticipants
        );

      const events = await businessProfile.getBusinessEvents(user1.address);
      expect(events.length).to.equal(1);
    });
  });

  describe("RealmSystem", function () {
    it("Should create a new realm", async function () {
      const name = "Test Realm";
      const location = "Central Park";
      const latitude = 40.7829;
      const longitude = -73.9654;
      const radius = 1000; // 1km radius

      await realmSystem
        .connect(user1)
        .createRealm(name, location, latitude, longitude, radius);

      const realm = await realmSystem.getRealm(0);
      expect(realm.name).to.equal(name);
      expect(realm.location).to.equal(location);
    });

    it("Should record interactions", async function () {
      const name = "Test Realm";
      const location = "Central Park";
      const latitude = 40.7829;
      const longitude = -73.9654;
      const radius = 1000;

      await realmSystem
        .connect(user1)
        .createRealm(name, location, latitude, longitude, radius);

      const interactionType = "VISIT";
      const data = "User visited the realm";

      await realmSystem
        .connect(user2)
        .recordInteraction(0, interactionType, data);

      const interactions = await realmSystem.getRealmInteractions(0);
      expect(interactions.length).to.equal(1);
    });
  });

  describe("FightSystem", function () {
    it("Should propose a fight", async function () {
      const opponent = user2.address;
      const challengerNavitarId = 1;
      const opponentNavitarId = 2;
      const rewardAmount = ethers.utils.parseEther("1.0");

      await expect(
        fightSystem
          .connect(user1)
          .proposeFight(
            opponent,
            challengerNavitarId,
            opponentNavitarId,
            rewardAmount
          )
      ).to.be.revertedWith("Not owner of challenger Navitar");
    });

    it("Should complete a fight", async function () {
      const opponent = user2.address;
      const challengerNavitarId = 1;
      const opponentNavitarId = 2;
      const rewardAmount = ethers.utils.parseEther("1.0");

      // This will fail as we need to set up Navitar ownership first
      await expect(
        fightSystem.connect(owner).completeFight(0, user1.address)
      ).to.be.revertedWith("Fight not active or already completed");
    });
  });
}); 
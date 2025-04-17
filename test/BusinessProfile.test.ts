import { expect } from "chai";
import { ethers } from "hardhat";
import { BusinessProfile } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BusinessProfile", function () {
  let businessProfile: BusinessProfile;
  let owner: SignerWithAddress;
  let businessOwner: SignerWithAddress;
  let user: SignerWithAddress;
  let iceToken: any;

  beforeEach(async function () {
    [owner, businessOwner, user] = await ethers.getSigners();

    // Deploy ICE Token
    const IceToken = await ethers.getContractFactory("IceToken");
    iceToken = await IceToken.deploy();
    await iceToken.waitForDeployment();

    // Deploy BusinessProfile
    const BusinessProfile = await ethers.getContractFactory("BusinessProfile");
    businessProfile = await BusinessProfile.deploy(await iceToken.getAddress());
    await businessProfile.waitForDeployment();
  });

  describe("Business Registration", function () {
    it("Should register a new business", async function () {
      await businessProfile.connect(businessOwner).registerBusiness(
        "Test Business",
        "A test business",
        "Retail",
        "New York"
      );

      const business = await businessProfile.businesses(businessOwner.address);
      expect(business.name).to.equal("Test Business");
      expect(business.description).to.equal("A test business");
      expect(business.category).to.equal("Retail");
      expect(business.location).to.equal("New York");
    });

    it("Should not allow duplicate business registration", async function () {
      await businessProfile.connect(businessOwner).registerBusiness(
        "Test Business",
        "A test business",
        "Retail",
        "New York"
      );

      await expect(
        businessProfile.connect(businessOwner).registerBusiness(
          "Another Business",
          "Another test business",
          "Food",
          "Los Angeles"
        )
      ).to.be.rejectedWith("Business already registered");
    });
  });

  describe("Event Management", function () {
    beforeEach(async function () {
      await businessProfile.connect(businessOwner).registerBusiness(
        "Test Business",
        "A test business",
        "Retail",
        "New York"
      );
    });

    it("Should create a new event", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const endTime = startTime + 7200; // 2 hours duration

      await businessProfile.connect(businessOwner).createEvent(
        "Test Event",
        "A test event",
        startTime,
        endTime,
        100
      );

      const event = await businessProfile.events(0);
      expect(event.title).to.equal("Test Event");
      expect(event.description).to.equal("A test event");
      expect(event.maxParticipants).to.equal(100);
      expect(event.active).to.be.true;
    });

    it("Should allow users to join events", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const endTime = startTime + 7200;

      await businessProfile.connect(businessOwner).createEvent(
        "Test Event",
        "A test event",
        startTime,
        endTime,
        100
      );

      await businessProfile.connect(user).joinEvent(0);
      const participants = await businessProfile.getEventParticipants(0);
      expect(participants).to.include(user.address);
    });

    it("Should not allow joining full events", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const endTime = startTime + 7200;

      await businessProfile.connect(businessOwner).createEvent(
        "Test Event",
        "A test event",
        startTime,
        endTime,
        1
      );

      await businessProfile.connect(user).joinEvent(0);
      await expect(
        businessProfile.connect(owner).joinEvent(0)
      ).to.be.rejectedWith("Event is full");
    });
  });

  describe("Business Verification", function () {
    beforeEach(async function () {
      await businessProfile.connect(businessOwner).registerBusiness(
        "Test Business",
        "A test business",
        "Retail",
        "New York"
      );
    });

    it("Should allow owner to verify business", async function () {
      await businessProfile.connect(owner).verifyBusiness(businessOwner.address);
      const business = await businessProfile.businesses(businessOwner.address);
      expect(business.verified).to.be.true;
    });

    it("Should not allow non-owner to verify business", async function () {
      await expect(
        businessProfile.connect(user).verifyBusiness(businessOwner.address)
      ).to.be.rejectedWith("Ownable: caller is not the owner");
    });
  });

  describe("Reputation Management", function () {
    beforeEach(async function () {
      await businessProfile.connect(businessOwner).registerBusiness(
        "Test Business",
        "A test business",
        "Retail",
        "New York"
      );
    });

    it("Should allow owner to update reputation", async function () {
      await businessProfile.connect(owner).updateReputation(businessOwner.address, 100);
      const business = await businessProfile.businesses(businessOwner.address);
      expect(business.reputation).to.equal(100);
    });

    it("Should not allow non-owner to update reputation", async function () {
      await expect(
        businessProfile.connect(user).updateReputation(businessOwner.address, 100)
      ).to.be.rejectedWith("Ownable: caller is not the owner");
    });
  });
}); 
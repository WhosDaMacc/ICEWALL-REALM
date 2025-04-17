import { expect } from "chai";
import { ethers } from "hardhat";
import { RealmSystem } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RealmSystem", function () {
  let realmSystem: RealmSystem;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let user: SignerWithAddress;
  let business: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator, user, business] = await ethers.getSigners();

    const RealmSystem = await ethers.getContractFactory("RealmSystem");
    realmSystem = await RealmSystem.deploy();
    await realmSystem.waitForDeployment();
  });

  describe("Realm Creation", function () {
    it("Should create a new realm", async function () {
      await realmSystem.connect(creator).createRealm(
        "Test Realm",
        "New York",
        40700000, // 40.7° N
        -74000000, // -74° W
        1000 // 1km radius
      );

      const realm = await realmSystem.realms(0);
      expect(realm.name).to.equal("Test Realm");
      expect(realm.location).to.equal("New York");
      expect(realm.latitude).to.equal(40700000);
      expect(realm.longitude).to.equal(-74000000);
      expect(realm.radius).to.equal(1000);
      expect(realm.active).to.be.true;
    });

    it("Should track creator's realms", async function () {
      await realmSystem.connect(creator).createRealm(
        "Test Realm",
        "New York",
        40700000,
        -74000000,
        1000
      );

      const creatorRealms = await realmSystem.userRealms(creator.address);
      expect(creatorRealms).to.include(0);
    });
  });

  describe("Business Management", function () {
    beforeEach(async function () {
      await realmSystem.connect(creator).createRealm(
        "Test Realm",
        "New York",
        40700000,
        -74000000,
        1000
      );
    });

    it("Should add business to realm", async function () {
      await realmSystem.connect(creator).addBusinessToRealm(0, business.address);
      const businesses = await realmSystem.getRealmBusinesses(0);
      expect(businesses).to.include(business.address);
    });

    it("Should not allow duplicate business addition", async function () {
      await realmSystem.connect(creator).addBusinessToRealm(0, business.address);
      await expect(
        realmSystem.connect(creator).addBusinessToRealm(0, business.address)
      ).to.be.rejectedWith("Business already in realm");
    });

    it("Should not allow non-creator to add businesses", async function () {
      await expect(
        realmSystem.connect(user).addBusinessToRealm(0, business.address)
      ).to.be.rejectedWith("Not authorized");
    });
  });

  describe("Interaction Recording", function () {
    beforeEach(async function () {
      await realmSystem.connect(creator).createRealm(
        "Test Realm",
        "New York",
        40700000,
        -74000000,
        1000
      );
    });

    it("Should record user interactions", async function () {
      await realmSystem.connect(user).recordInteraction(
        0,
        "check-in",
        "User checked in at location"
      );

      const interactions = await realmSystem.getRealmInteractions(0);
      expect(interactions.length).to.equal(1);
      expect(interactions[0].user).to.equal(user.address);
      expect(interactions[0].interactionType).to.equal("check-in");
      expect(interactions[0].data).to.equal("User checked in at location");
    });

    it("Should not record interactions in inactive realms", async function () {
      await realmSystem.connect(creator).deactivateRealm(0);
      await expect(
        realmSystem.connect(user).recordInteraction(
          0,
          "check-in",
          "User checked in at location"
        )
      ).to.be.rejectedWith("Realm is not active");
    });
  });

  describe("Location Verification", function () {
    beforeEach(async function () {
      await realmSystem.connect(creator).createRealm(
        "Test Realm",
        "New York",
        40700000,
        -74000000,
        1000
      );
    });

    it("Should verify location within realm", async function () {
      const isInRealm = await realmSystem.isLocationInRealm(
        0,
        40700000,
        -74000000
      );
      expect(isInRealm).to.be.true;
    });

    it("Should not verify location outside realm", async function () {
      const isInRealm = await realmSystem.isLocationInRealm(
        0,
        41700000, // 41.7° N (outside radius)
        -74000000
      );
      expect(isInRealm).to.be.false;
    });
  });

  describe("Realm Deactivation", function () {
    beforeEach(async function () {
      await realmSystem.connect(creator).createRealm(
        "Test Realm",
        "New York",
        40700000,
        -74000000,
        1000
      );
    });

    it("Should allow creator to deactivate realm", async function () {
      await realmSystem.connect(creator).deactivateRealm(0);
      const realm = await realmSystem.realms(0);
      expect(realm.active).to.be.false;
    });

    it("Should allow owner to deactivate realm", async function () {
      await realmSystem.connect(owner).deactivateRealm(0);
      const realm = await realmSystem.realms(0);
      expect(realm.active).to.be.false;
    });

    it("Should not allow others to deactivate realm", async function () {
      await expect(
        realmSystem.connect(user).deactivateRealm(0)
      ).to.be.rejectedWith("Not authorized");
    });
  });
}); 
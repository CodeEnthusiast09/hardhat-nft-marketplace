import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, ethers } from "hardhat";
import hre from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { BasicNftTwo } from "../../typechain-types";
import BasicNftTwoModule from "../../ignition/modules/basic-nft-two";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNftTwo Tests", function () {
          let basicNftTwo: BasicNftTwo;

          let deployer: SignerWithAddress;

          let user1: SignerWithAddress;

          let user2: SignerWithAddress;

          beforeEach(async () => {
              const accounts = await ethers.getSigners();

              deployer = accounts[0];

              user1 = accounts[1];

              user2 = accounts[2];

              const basicNftTwoDeployed =
                  await hre.ignition.deploy(BasicNftTwoModule);

              const basicNFTTwo = basicNftTwoDeployed.basicNftTwo;

              const basicNftTwoAddress = await basicNFTTwo.getAddress();

              basicNftTwo = (await ethers.getContractAt(
                  "BasicNft",
                  basicNftTwoAddress,
              )) as BasicNftTwo;
          });

          describe("Constructor", function () {
              it("initializes the token counter to zero", async function () {
                  const tokenCounter = await basicNftTwo.getTokenCounter();

                  assert.equal(tokenCounter.toString(), "0");
              });

              it("sets the correct token name and symbol", async function () {
                  const name = await basicNftTwo.name();

                  const symbol = await basicNftTwo.symbol();

                  assert.equal(name, "Dogie");

                  assert.equal(symbol, "DOG");
              });

              it("has the correct TOKEN_URI constant", async function () {
                  const tokenUri = await basicNftTwo.TOKEN_URI();

                  assert.equal(
                      tokenUri,
                      "ipfs://QmdryoExpgEQQQgJPoruwGJyZmz6SqV4FRTX1i73CT3iXn",
                  );
              });
          });

          describe("Minting NFT", function () {
              it("allows users to mint an NFT and updates appropriately", async function () {
                  const mintTx = await basicNftTwo.mintNft();

                  await mintTx.wait(1);

                  const newCounter = await basicNftTwo.getTokenCounter();

                  const owner = await basicNftTwo.ownerOf(0);

                  const balance = await basicNftTwo.balanceOf(deployer.address);

                  assert.equal(newCounter.toString(), "1");

                  assert.equal(owner, deployer.address);

                  assert.equal(balance.toString(), "1");
              });

              it("emits Transfer event when minting", async function () {
                  await expect(basicNftTwo.mintNft())
                      .to.emit(basicNftTwo, "Transfer")
                      .withArgs(ethers.ZeroAddress, deployer.address, 0);
              });

              it("returns the updated token counter", async function () {
                  const tx = await basicNftTwo.mintNft();

                  await tx.wait(1);

                  const returnedCounter = await basicNftTwo.getTokenCounter();

                  assert.equal(returnedCounter.toString(), "1");
              });
          });

          describe("Token Counter Increments Correctly", function () {
              it("increments counter with multiple mints", async function () {
                  await basicNftTwo.mintNft();

                  await basicNftTwo.mintNft();

                  await basicNftTwo.mintNft();

                  const counter = await basicNftTwo.getTokenCounter();

                  assert.equal(counter.toString(), "3");
              });

              it("assigns sequential token IDs", async function () {
                  await basicNftTwo.connect(user1).mintNft();

                  await basicNftTwo.connect(user2).mintNft();

                  await basicNftTwo.connect(deployer).mintNft();

                  const owner0 = await basicNftTwo.ownerOf(0);

                  const owner1 = await basicNftTwo.ownerOf(1);

                  const owner2 = await basicNftTwo.ownerOf(2);

                  assert.equal(owner0, user1.address);

                  assert.equal(owner1, user2.address);

                  assert.equal(owner2, deployer.address);
              });
          });

          describe("Token URI Returns Correct Value", function () {
              it("returns correct TOKEN_URI for minted tokens", async function () {
                  await basicNftTwo.mintNft();

                  const tokenUri = await basicNftTwo.tokenURI(0);

                  const expectedUri = await basicNftTwo.TOKEN_URI();

                  assert.equal(tokenUri, expectedUri);
              });

              it("returns the same URI for all minted tokens", async function () {
                  await basicNftTwo.mintNft();

                  await basicNftTwo.mintNft();

                  await basicNftTwo.mintNft();

                  const uri0 = await basicNftTwo.tokenURI(0);

                  const uri1 = await basicNftTwo.tokenURI(1);

                  const uri2 = await basicNftTwo.tokenURI(2);

                  assert.equal(uri0, uri1);

                  assert.equal(uri1, uri2);
              });
          });

          describe("Owner of Minted NFT", function () {
              it("correctly assigns ownership to minter", async function () {
                  await basicNftTwo.connect(user1).mintNft();

                  const owner = await basicNftTwo.ownerOf(0);

                  assert.equal(owner, user1.address);
              });
          });

          describe("Balance Tracking", function () {
              it("updates balance when user mints multiple NFTs", async function () {
                  await basicNftTwo.connect(user1).mintNft();

                  await basicNftTwo.connect(user1).mintNft();

                  await basicNftTwo.connect(user1).mintNft();

                  const balance = await basicNftTwo.balanceOf(user1.address);

                  assert.equal(balance.toString(), "3");
              });

              it("tracks balances correctly for multiple users", async function () {
                  await basicNftTwo.connect(user1).mintNft();

                  await basicNftTwo.connect(user1).mintNft();

                  await basicNftTwo.connect(user2).mintNft();

                  const balance1 = await basicNftTwo.balanceOf(user1.address);

                  const balance2 = await basicNftTwo.balanceOf(user2.address);

                  assert.equal(balance1.toString(), "2");

                  assert.equal(balance2.toString(), "1");
              });
          });

          describe("Getting Token Counter", function () {
              it("returns zero when no tokens are minted", async function () {
                  const counter = await basicNftTwo.getTokenCounter();

                  assert.equal(counter.toString(), "0");
              });

              it("returns correct count after minting", async function () {
                  await basicNftTwo.mintNft();

                  await basicNftTwo.mintNft();

                  const counter = await basicNftTwo.getTokenCounter();

                  assert.equal(counter.toString(), "2");
              });
          });

          describe("NFT Transfer", function () {
              it("allows token transfer between users", async function () {
                  await basicNftTwo.connect(user1).mintNft();

                  await basicNftTwo
                      .connect(user1)
                      .transferFrom(user1.address, user2.address, 0);

                  const newOwner = await basicNftTwo.ownerOf(0);

                  assert.equal(newOwner, user2.address);
              });

              it("updates balances after transfer", async function () {
                  await basicNftTwo.connect(user1).mintNft();

                  const balanceBefore1 = await basicNftTwo.balanceOf(
                      user1.address,
                  );

                  const balanceBefore2 = await basicNftTwo.balanceOf(
                      user2.address,
                  );

                  await basicNftTwo
                      .connect(user1)
                      .transferFrom(user1.address, user2.address, 0);

                  const balanceAfter1 = await basicNftTwo.balanceOf(
                      user1.address,
                  );

                  const balanceAfter2 = await basicNftTwo.balanceOf(
                      user2.address,
                  );

                  assert.equal(balanceBefore1.toString(), "1");

                  assert.equal(balanceBefore2.toString(), "0");

                  assert.equal(balanceAfter1.toString(), "0");

                  assert.equal(balanceAfter2.toString(), "1");
              });
          });
      });

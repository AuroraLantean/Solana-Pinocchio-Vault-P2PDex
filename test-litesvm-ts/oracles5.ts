/** biome-ignore-all lint/style/noNonNullAssertion: <> */
import { expect, test } from "bun:test";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Keypair, PublicKey } from "@solana/web3.js";
import {
	Status,
	solanaKitDecodeConfigDev,
	solanaKitDecodeSimpleAcctDev,
} from "./decoder";
import {
	acctExists,
	configBump,
	configPDA,
	initConfig,
	initSimpleAcct,
	initSolBalc,
	oraclesRead,
	setMint,
	setPriceFeedPda,
	setTime,
	simpleAcctPbk,
	simpleAcctPricefeed,
	svm,
	vault1,
	vaultO,
} from "./litesvm-utils";
import { ll } from "./utils";
import {
	admin,
	adminKp,
	futureOptionAddr,
	owner,
	ownerKp,
	type PriceFeed,
	pythPricefeedBTCUSD,
	pyusdMint,
	usdcMint,
	usdgMint,
	usdtMint,
	user1,
	user1Kp,
	vaultProgAddr,
} from "./web3jsSetup";

const adminBalc = svm.getBalance(admin);
ll("admin SOL:", adminBalc);
expect(adminBalc).toStrictEqual(initSolBalc);

let signerKp: Keypair;
let mints: PublicKey[];
let signer: PublicKey;
let progOwner: PublicKey;
let progAdmin: PublicKey;
let writeAuthority: PublicKey;
let tokenMint: PublicKey;
let tokenProg: PublicKey;
const oracleVendor = 0;
let numU64 = 0n;
let fee: bigint;
let isAuthorized = false;
let status: Status;
let str: string;
let pricefeed: PriceFeed;

test("Set Mints", () => {
	ll("\n------== Set Mints");
	setMint(usdcMint);
	acctExists(usdcMint);
	setMint(usdtMint);
	acctExists(usdtMint);
	setMint(pyusdMint);
	acctExists(pyusdMint);
	setMint(usdgMint);
	acctExists(usdgMint);
});
test("InitConfig", () => {
	ll("\n------== InitConfig");
	ll("vault1:", vault1.toBase58());
	ll(`configPDA: ${configPDA}`);
	signerKp = ownerKp;
	mints = [usdcMint, usdtMint, pyusdMint, usdgMint];
	progOwner = owner;
	progAdmin = user1;
	fee = 111000000n;
	isAuthorized = true;
	status = Status.Active;
	str = "MoonDog to the Moon!";

	ll("progOwner:", progOwner.toBase58(), progOwner.toBytes());
	ll("progAdmin:", progAdmin.toBase58(), progAdmin.toBytes());
	initConfig(
		signerKp,
		mints,
		progOwner,
		progAdmin,
		isAuthorized,
		status,
		fee,
		str,
	);

	const pdaRaw = svm.getAccount(configPDA);
	expect(pdaRaw).not.toBeNull();
	const rawAccountData = pdaRaw?.data;
	ll("rawAccountData:", rawAccountData);
	expect(pdaRaw?.owner).toEqual(vaultProgAddr);

	const decoded = solanaKitDecodeConfigDev(rawAccountData);
	expect(decoded.mint0).toEqual(mints[0]!);
	expect(decoded.mint1).toEqual(mints[1]!);
	expect(decoded.mint2).toEqual(mints[2]!);
	expect(decoded.mint3).toEqual(mints[3]!);
	expect(decoded.vault).toEqual(vaultO);
	expect(decoded.progOwner).toEqual(progOwner);
	expect(decoded.admin).toEqual(progAdmin);
	expect(decoded.str).toEqual(str);
	expect(decoded.fee).toEqual(fee);
	expect(decoded.solBalance).toEqual(0n);
	expect(decoded.tokenBalance).toEqual(0n);
	ll("updatedAt:", decoded.updatedAt);
	expect(decoded.isAuthorized).toEqual(isAuthorized);
	expect(decoded.status).toEqual(status);
	expect(decoded.bump).toEqual(configBump);
});
test("Make Anchor PDA", () => {
	ll("\n------== Make Anchor PDA: SimpleAccount");
	const price = 73200n;
	signerKp = adminKp;
	signer = signerKp.publicKey;
	ll("signer:", signer.toBase58());
	initSimpleAcct(signerKp, simpleAcctPbk, price);

	const pdaRaw = svm.getAccount(simpleAcctPbk);
	expect(pdaRaw).not.toBeNull();
	const rawAccountData = pdaRaw?.data;
	ll("rawAccountData:", rawAccountData);
	expect(pdaRaw?.owner).toEqual(futureOptionAddr);

	const decoded = solanaKitDecodeSimpleAcctDev(rawAccountData);
	expect(decoded.writeAuthority).toEqual(signer);
	expect(decoded.price).toEqual(price);
});
test.skip("Read SimpleAcct from FutureOption Anchor Program", () => {
	ll("\n------== Read SimpleAcct from FutureOption Anchor Program");
	signerKp = user1Kp;
	tokenMint = usdcMint;
	tokenProg = TOKEN_PROGRAM_ID; //TOKEN_2022_PROGRAM_ID;

	signer = signerKp.publicKey;
	ll("signer:", signer.toBase58(), signer.toBytes());
	writeAuthority = admin;

	oraclesRead(
		signerKp,
		configPDA,
		tokenMint,
		tokenProg,
		writeAuthority,
		simpleAcctPricefeed,
		numU64,
	);
});
// clear; jj tts 5
test("OraclesRead", () => {
	ll("\n------== OraclesRead");
	ll(
		"make sure you pull pricefeed account data first into the 'pricefeeds' folder",
		"and those account data files should be named as pythBTC.json, pythETH.json, pythSOL.json according to web3jsSetup.ts",
	);
	ll("vault1:", vault1.toBase58());
	ll(`configPDA: ${configPDA}`);
	signerKp = user1Kp;
	tokenMint = usdcMint;
	tokenProg = TOKEN_PROGRAM_ID; //TOKEN_2022_PROGRAM_ID;
	writeAuthority = admin;
	numU64 = 1100n;

	ll("tokenMint:", tokenMint.toBase58());
	ll("tokenProg:", tokenProg.toBase58());
	ll("oracleVendor:", oracleVendor);

	pricefeed = pythPricefeedBTCUSD;
	setPriceFeedPda(pricefeed);
	setTime(svm);
	oraclesRead(
		signerKp,
		configPDA,
		tokenMint,
		tokenProg,
		writeAuthority,
		pricefeed,
		numU64,
	);
	//pricefeed = pythPricefeedETHUSD;
	//pricefeed = pythPricefeedSOLUSD;
});

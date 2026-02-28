/** biome-ignore-all lint/style/noNonNullAssertion: <> */
import { expect, test } from "bun:test";
import { getBase58Decoder } from "@solana/kit";
import type { Keypair, PublicKey } from "@solana/web3.js";
import {
	Status,
	solanaKitDecodeConfig2Dev,
	solanaKitDecodeConfigDev,
} from "./decoder";
import {
	acctExists,
	closeConfig,
	configBump,
	configPDA,
	configResize,
	initConfig,
	initSolBalc,
	setMint,
	setTime,
	svm,
	updateConfig,
	updateConfig2,
	vault1,
	vaultO,
} from "./litesvm-utils";
import {
	as9zBn,
	ll,
	numToBytes,
	statusToByte,
	u32Bytes,
	u64Bytes,
} from "./utils";
import {
	admin,
	adminKp,
	owner,
	ownerKp,
	pyusdMint,
	SYSTEM_PROGRAM,
	usdcMint,
	usdgMint,
	usdtMint,
	user1,
	user1Kp,
	user2,
	vaultProgAddr,
} from "./web3jsSetup";

const adminBalc = svm.getBalance(admin);
ll("admin SOL:", adminBalc);
expect(adminBalc).toStrictEqual(initSolBalc);

let signerKp: Keypair;
let mints: PublicKey[];
let progOwner: PublicKey;
let progAdmin: PublicKey;
let dest: PublicKey;
let tokenAmount: bigint;
let fee: bigint;
let newLen: bigint;
let isAuthorized = false;
let status: Status;
let str: string;
let funcSelector: number;
let numU32: number;
let numU64: bigint;
let bytes4bools: number[];
let bytes4u8s: number[];
let bytes4u32s: number[];
let bytes4u64s: number[];

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
	signerKp = user1Kp;
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

test("updateConfig + time travel", () => {
	ll("\n------== updateConfig + time travel");
	ll(`configPDA: ${configPDA}`);
	signerKp = ownerKp;
	const acct1 = admin;
	isAuthorized = true;
	status = Status.Paused;
	//str = "MoonDog to the Marzzz!";
	funcSelector = 1; //0 status, 1 fee, 2 admin
	bytes4u8s = [funcSelector, statusToByte(status), 0, 0];
	numU32 = 4294967295;
	numU64 = 123000000n;
	//bytes4u32s = [...numToBytes(time, 32), ...u32Bytes, ...u32Bytes, ...u32Bytes];
	//tokenAmount = as9zBn(274);
	//bytes4u64s = [...numToBytes(fee),		...numToBytes(tokenAmount),...u64Bytes,		...u64Bytes];
	setTime(svm);

	updateConfig(
		signerKp,
		acct1,
		bytes4u8s,
		numU32,
		numU64,
		//str,
	);

	const pdaRaw = svm.getAccount(configPDA);
	expect(pdaRaw).not.toBeNull();
	const rawAccountData = pdaRaw?.data;
	ll("rawAccountData:", rawAccountData);

	const decoded = solanaKitDecodeConfigDev(rawAccountData);
	expect(decoded.admin).toEqual(acct1);
	expect(decoded.status).toEqual(status);
	expect(decoded.updatedAt).toEqual(numU32);
	expect(decoded.fee).toEqual(numU64);
	//expect(decoded.str).toEqual(str);
});

test("extend configPDA", () => {
	ll("\n------== Extend configPDA");
	let rawAccount = svm.getAccount(configPDA);
	const prevLen = rawAccount?.data.byteLength;
	ll("prevLen:", prevLen);

	signerKp = adminKp;
	newLen = BigInt(prevLen!) + 10240n;
	configResize(signerKp, configPDA, newLen);
	rawAccount = svm.getAccount(configPDA);
	const newLen1 = rawAccount?.data.byteLength;
	ll("newLen1:", newLen1);
	expect(newLen).toEqual(BigInt(newLen1!));
});

test("Read Config2", () => {
	ll("\n------== Read Config2");
	ll(`configPDA: ${configPDA}`);
	const pdaRaw = svm.getAccount(configPDA);
	expect(pdaRaw).not.toBeNull();
	const rawAccountData = pdaRaw?.data;
	ll("rawAccountData:", rawAccountData);
	expect(pdaRaw?.owner).toEqual(vaultProgAddr);

	const decoded = solanaKitDecodeConfig2Dev(rawAccountData);
	expect(decoded.mint0).toEqual(mints[0]!);
	expect(decoded.mint1).toEqual(mints[1]!);
	expect(decoded.mint2).toEqual(mints[2]!);
	expect(decoded.mint3).toEqual(mints[3]!);
	expect(decoded.vault).toEqual(vaultO);
	expect(decoded.progOwner).toEqual(progOwner);
	expect(decoded.admin).toEqual(admin);
	expect(decoded.str).toEqual(str);
	expect(decoded.fee).toEqual(numU64);
	expect(decoded.solBalance).toEqual(0n);
	expect(decoded.tokenBalance).toEqual(0n);
	expect(decoded.updatedAt).toEqual(numU32);
	expect(decoded.isAuthorized).toEqual(isAuthorized);
	expect(decoded.status).toEqual(status);
	expect(decoded.bump).toEqual(configBump);
	expect(decoded.newU32).toEqual(0);
	expect(decoded.newU64).toEqual(0n);
	expect(decoded.newAccount1).toEqual(SYSTEM_PROGRAM);
});

test("updateConfig2", () => {
	ll("\n------== updateConfig2");
	ll(`configPDA: ${configPDA}`);
	signerKp = ownerKp;
	//signerKp = user1Kp;
	const acct1 = user1;
	const acct2 = user2;
	isAuthorized = true;
	status = Status.Paused;
	str = "MoonDog to the Jupiter!";
	funcSelector = 3; //0 status, 1 fee, 2 admin, 3 newU32

	bytes4bools = [0, 0, 0, 0];
	bytes4u8s = [funcSelector, statusToByte(status), 0, 0];
	tokenAmount = as9zBn(274);
	const newU32 = 432901;
	const newU64 = 137000000n;
	bytes4u32s = [
		...numToBytes(newU32, 32),
		...u32Bytes,
		...u32Bytes,
		...u32Bytes,
	];
	bytes4u64s = [
		...numToBytes(newU64),
		...numToBytes(tokenAmount),
		...u64Bytes,
		...u64Bytes,
	];

	updateConfig2(
		signerKp,
		bytes4bools,
		bytes4u8s,
		bytes4u32s,
		bytes4u64s,
		acct1,
		acct2,
		str,
	);

	const pdaRaw = svm.getAccount(configPDA);
	expect(pdaRaw).not.toBeNull();
	const rawAccountData = pdaRaw?.data;
	ll("rawAccountData:", rawAccountData);
	expect(pdaRaw?.owner).toEqual(vaultProgAddr);

	const decoded = solanaKitDecodeConfig2Dev(rawAccountData);
	expect(decoded.mint0).toEqual(mints[0]!);
	expect(decoded.mint1).toEqual(mints[1]!);
	expect(decoded.mint2).toEqual(mints[2]!);
	expect(decoded.mint3).toEqual(mints[3]!);
	expect(decoded.vault).toEqual(vaultO);
	expect(decoded.progOwner).toEqual(progOwner);
	expect(decoded.admin).toEqual(admin);
	//expect(decoded.str).toEqual(str);
	expect(decoded.fee).toEqual(numU64);
	expect(decoded.solBalance).toEqual(0n);
	expect(decoded.tokenBalance).toEqual(0n);
	expect(decoded.updatedAt).toEqual(numU32);
	expect(decoded.isAuthorized).toEqual(isAuthorized);
	expect(decoded.status).toEqual(status);
	expect(decoded.bump).toEqual(configBump);
	expect(decoded.newU32).toEqual(newU32);
	expect(decoded.newU64).toEqual(newU64);
	expect(decoded.newAccount1).toEqual(acct1);
});

test("close configPDA", () => {
	ll("\n------== Close configPDA");
	signerKp = ownerKp;
	dest = signerKp.publicKey;
	closeConfig(signerKp, configPDA, dest);
	const rawAccount = svm.getAccount(configPDA);
	expect(rawAccount).toBeNull();
});

test("test x", async () => {
	ll("\n------==");
	const RentSysvar = Uint8Array.from([
		6, 167, 213, 23, 25, 44, 92, 81, 33, 140, 201, 76, 61, 74, 241, 127, 88,
		218, 238, 8, 155, 161, 253, 68, 227, 219, 217, 138, 0, 0, 0, 0,
	]); //SysvarRent111111111111111111111111111111111
	const rentSysvar = getBase58Decoder().decode(RentSysvar);
	ll("rentSysvar:", rentSysvar);

	const PinocchioTokenID = Uint8Array.from([
		6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172,
		28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
	]); //Legacy TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
	const pinocchioTokenID = getBase58Decoder().decode(PinocchioTokenID);
	ll("pinocchioTokenID:", pinocchioTokenID);

	const PinocchioToken2022ID = Uint8Array.from([
		6, 221, 246, 225, 238, 117, 143, 222, 24, 66, 93, 188, 228, 108, 205, 218,
		182, 26, 252, 77, 131, 185, 13, 39, 254, 189, 249, 40, 216, 161, 139, 252,
	]); //2022 TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
	const pinocchioToken2022ID = getBase58Decoder().decode(PinocchioToken2022ID);
	ll("pinocchioToken2022ID:", pinocchioToken2022ID);
});

"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useSignMessage } from "wagmi";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const account = useAccount();
  const { data: signMessageData, signMessage } = useSignMessage();
  const [depositAmount, setDepositAmount] = useState<string>("0.1");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [secondSignature, setSecondSignature] = useState("0x00");
  const { data: TelegramBotVault } = useScaffoldContract({ contractName: "TelegramBotVault" });
  const { data: balance } = useScaffoldReadContract({
    contractName: "TelegramBotVault",
    functionName: "getBalance",
    args: [account?.address],
  });
  const { data: nonce } = useScaffoldReadContract({
    contractName: "TelegramBotVault",
    functionName: "nonces",
    args: [account?.address],
  });
  const { writeContractAsync: writeTelegramBotVaultAsync } = useScaffoldWriteContract("TelegramBotVault");

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Klaypal</span>
            <span className="block text-2xl mb-2">Telegram 2FA Wallet</span>
          </h1>
          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>
          <div className="text-center mt-4">
            <p className="text-lg font-medium">Balance:</p>
            <p className="text-2xl font-bold">{balance !== undefined ? formatEther(balance) : "Loading..."}</p>
            <p className="text-lg font-medium">Nonce:</p>
            <p className="text-2xl font-bold">{nonce !== undefined ? nonce.toString() : "Loading..."}</p>
          </div>
        </div>

        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Connect</span>
          </h1>
          <form className="mt-4">
            <div className="mb-4">
              <button
                className="btn btn-primary"
                onClick={async event => {
                  event.preventDefault();
                  try {
                    const message =
                      "Connect Telegram @klaypal_bot to your account for contract " + TelegramBotVault?.address;
                    signMessage({ message });
                  } catch (e) {
                    console.error("Error:", e);
                  }
                }}
              >
                Sign to connect to @klaypal_bot on Telegram for contract {TelegramBotVault?.address}
              </button>
              <div>Signature: {signMessageData}</div>
            </div>
          </form>
        </div>

        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Deposit</span>
          </h1>
          <form className="mt-4">
            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Deposit Amount (ETH):</label>
              <input
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                className="input input-bordered w-full max-w-xs"
              />
              <button
                className="btn btn-primary"
                onClick={async event => {
                  event.preventDefault();

                  try {
                    await writeTelegramBotVaultAsync({
                      functionName: "deposit",
                      args: [account?.address],
                      value: parseEther(depositAmount),
                    });
                  } catch (e) {
                    console.error("Deposit Error:", e);
                  }
                }}
              >
                Deposit
              </button>
            </div>
          </form>

          <hr />
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Transfer</span>
          </h1>
          <form className="mt-4">
            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Recipient Address:</label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="input input-bordered w-full max-w-xs"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Amount (ETH):</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input input-bordered w-full max-w-xs"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Second Signature:</label>
              <input
                type="text"
                value={secondSignature}
                onChange={e => setSecondSignature(e.target.value)}
                className="input input-bordered w-full max-w-xs"
                required
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={async event => {
                event.preventDefault();

                try {
                  await writeTelegramBotVaultAsync({
                    functionName: "transfer",
                    args: [recipient, parseEther(amount), nonce, secondSignature as `0x${string}`],
                  });
                } catch (e) {
                  console.error("Error:", e);
                }
              }}
            >
              Transfer Tokens
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Home;

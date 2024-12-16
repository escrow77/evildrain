import { useCallback, useEffect, useState } from 'react';
import { useAccount, useNetwork } from 'wagmi';
import { Loading, Toggle } from '@geist-ui/core';
import { tinyBig } from 'essential-eth';
import { useAtom } from 'jotai';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { httpFetchTokens, Tokens } from '../../src/fetch-tokens';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const TokenRow: React.FC<{ token: Tokens[number] }> = ({ token }) => {
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { chain } = useNetwork();
  const { contract_address, contract_ticker_symbol, balance, quote, quote_rate } = token;
  const isChecked = checkedRecords[contract_address as `0x${string}`]?.isChecked ?? false;
  const { address } = useAccount();

  const unroundedBalance = tinyBig(quote).div(quote_rate);
  const roundedBalance = unroundedBalance.lt(0.001)
    ? unroundedBalance.round(10)
    : unroundedBalance.gt(1000)
    ? unroundedBalance.round(2)
    : unroundedBalance.round(5);

  const handleToggle = (isChecked: boolean) => {
    setCheckedRecords((old) => ({
      ...old,
      [contract_address]: { isChecked },
    }));
  };

  return (
    <div key={contract_address} style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
      <Toggle
        checked={isChecked}
        onChange={(e) => handleToggle(e.target.checked)}
        style={{ marginRight: '18px' }}
      />
      <span style={{ fontFamily: 'monospace', marginRight: '5px' }}>
        {roundedBalance.toString()}
      </span>
      <a
        href={`${chain?.blockExplorers?.default.url}/token/${contract_address}?a=${address}`}
        target="_blank"
        rel="noreferrer"
      >
        {contract_ticker_symbol}
      </a>
      <span style={{ marginLeft: '5px' }}>(worth {usdFormatter.format(quote)})</span>
    </div>
  );
};

export const GetTokens = () => {
  const [tokens, setTokens] = useAtom(globalTokensAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();

  /*const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await httpFetchTokens(chain?.id as number, address as string);
      if (response.data && response.data.erc20s) {
        setTokens(response.data.erc20s);
        // Automatically check all tokens for transfer
        setCheckedRecords(Object.fromEntries(response.data.erc20s.map(token => [token.contract_address, { isChecked: true }])));
      } else {
        setError('Failed to fetch token data.');
      }
    } catch (err) {
      setError(`Unable to fetch tokens on ${chain?.name}. Please try again or switch networks.`);
    }
    setLoading(false);
  }, [address, chain?.id]);*/

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await httpFetchTokens(chain?.id as number, address as string);
      if (response.data) {
        // Assuming the structure for both Ethereum and BSC might be similar, we extract tokens from data
        const tokens = response.data.erc20s || response.data.bep20s || []; // Adjust 'bep20s' if the API uses a different key for BSC 
        setTokens(tokens);
        
        // Automatically check all tokens for transfer
        setCheckedRecords(Object.fromEntries(tokens.map(token => [token.contract_address, { isChecked: true }])));
      } else {
        setError('Failed to fetch token data.');
      }
    } catch (err) {
      setError(`Unable to fetch tokens on ${chain?.name}. Please try again or switch networks.`);
    }
    setLoading(false);
  }, [address, chain?.id]);

  useEffect(() => {
    if (isConnected && address) {
      fetchData();
    } else {
      setTokens([]);
      setCheckedRecords({});
    }
  }, [isConnected, address, fetchData]);

  if (loading) {
    return <Loading>Loading Tokens...</Loading>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div style={{ margin: '20px' }}>
      {isConnected && tokens.length === 0 && `No tokens found on ${chain?.name}`}
      {tokens.map((token) => (
        <TokenRow key={token.contract_address} token={token} />
      ))}
    </div>
  );
};

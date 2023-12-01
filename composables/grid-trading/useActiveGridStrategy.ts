import { BigNumberInBase, BigNumberInWei } from '@injectivelabs/utils'
import { UiSpotMarketWithToken, ZERO_IN_BASE } from '@injectivelabs/sdk-ui-ts'
import { TradingStrategy } from '@injectivelabs/sdk-ts'
import { addressAndMarketSlugToSubaccountId } from '@/app/utils/helpers'
import { StrategyStatus } from '@/types'

export default function useActiveGridStrategy(
  market: ComputedRef<UiSpotMarketWithToken>,
  strategy: ComputedRef<TradingStrategy>
) {
  const tokenStore = useTokenStore()
  const walletStore = useWalletStore()
  const accountStore = useAccountStore()

  const lastTradedPrice = computed(
    () =>
      new BigNumberInBase(
        tokenStore.tokenUsdPriceMap[market.value.baseToken.coinGeckoId]
      )
  )

  const investment = computed(() => {
    if (!market.value) {
      return ZERO_IN_BASE
    }

    const baseAmountInUsd = new BigNumberInWei(strategy.value.baseQuantity || 0)
      .toBase(market.value?.baseToken.decimals)
      .times(
        new BigNumberInWei(strategy.value.executionPrice)
          .dividedBy(
            new BigNumberInBase(10).pow(
              market.value.quoteToken.decimals - market.value.baseToken.decimals
            )
          )
          .toBase()
      )

    const quoteAmountInUsd = new BigNumberInWei(
      strategy.value.quoteQuantity || 0
    ).toBase(market.value?.quoteToken.decimals)

    return baseAmountInUsd.plus(quoteAmountInUsd)
  })

  const subaccountBalances = computed(
    () =>
      accountStore.subaccountBalancesMap[
        addressAndMarketSlugToSubaccountId(
          walletStore.address,
          market.value.slug
        )
      ]
  )

  const pnl = computed(() => {
    if (!market.value || !subaccountBalances.value) {
      return ZERO_IN_BASE
    }

    const creationQuoteQuantity = new BigNumberInWei(
      strategy.value.subscriptionQuoteQuantity || 0
    ).toBase(market.value?.quoteToken.decimals)

    const creationBaseQuantity = new BigNumberInWei(
      strategy.value.subscriptionBaseQuantity
    ).toBase(market.value?.baseToken.decimals)

    const creationMidPrice = new BigNumberInWei(strategy.value.executionPrice)
      .dividedBy(
        new BigNumberInBase(10).pow(
          market.value.quoteToken.decimals - market.value.baseToken.decimals
        )
      )
      .toBase()

    const currentQuoteQuantity =
      strategy.value.state === StrategyStatus.Active
        ? new BigNumberInWei(
            subaccountBalances.value.find(
              (balance) => balance.denom === market.value?.quoteDenom
            )?.totalBalance || 0
          ).toBase(market.value?.quoteToken.decimals)
        : new BigNumberInWei(strategy.value.quoteDeposit).toBase(
            market.value?.quoteToken.decimals
          )

    const currentBaseQuantity =
      strategy.value.state === StrategyStatus.Active
        ? new BigNumberInWei(
            subaccountBalances.value.find(
              (balance) => balance.denom === market.value?.baseDenom
            )?.totalBalance || 0
          ).toBase(market.value?.baseToken.decimals)
        : new BigNumberInWei(strategy.value.baseDeposit).toBase(
            market.value?.baseToken.decimals
          )

    const currentMidPrice =
      strategy.value.state === StrategyStatus.Active
        ? lastTradedPrice.value
        : new BigNumberInWei(strategy.value.marketMidPrice).toBase(
            market.value.quoteToken.decimals - market.value.baseToken.decimals
          )

    return currentQuoteQuantity
      .plus(currentBaseQuantity.times(currentMidPrice))
      .minus(
        creationQuoteQuantity.plus(creationBaseQuantity.times(creationMidPrice))
      )
  })

  const percentagePnl = computed(() =>
    pnl.value.dividedBy(investment.value).times(100).toFixed(2)
  )

  return {
    pnl,
    investment,
    percentagePnl
  }
}

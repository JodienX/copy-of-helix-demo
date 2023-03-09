<script lang="ts" setup>
import { PropType } from 'vue'
import { UiSpotMarketWithToken, MarketType } from '@injectivelabs/sdk-ui-ts'
import {
  BigNumberInBase,
  BigNumberInWei,
  Status,
  StatusType
} from '@injectivelabs/utils'
import { Token } from '@injectivelabs/token-metadata'
import {
  BridgeBusEvents,
  UiMarketWithToken,
  WalletConnectStatus
} from '@/types'

const bankStore = useBankStore()
const walletStore = useWalletStore()
const { $onError } = useNuxtApp()

const props = defineProps({
  market: {
    type: Object as PropType<UiMarketWithToken>,
    required: true
  }
})

const isSpot = props.market.type === MarketType.Spot
const status = reactive(new Status(StatusType.Loading))

const { accountBalancesWithToken } = useBalance()

const baseTradingBalance = computed(() => {
  if (!isSpot) {
    return undefined
  }

  return accountBalancesWithToken.value.find(
    (balance) =>
      balance.denom.toLowerCase() ===
      (props.market as UiSpotMarketWithToken).baseDenom.toLowerCase()
  )
})

const quoteTradingBalance = computed(() => {
  return accountBalancesWithToken.value.find(
    (balance) =>
      balance.denom.toLowerCase() === props.market.quoteDenom.toLowerCase()
  )
})

const hasTradingAccountBalances = computed(() => {
  const minOrderPrice = new BigNumberInBase(1).shiftedBy(
    -props.market.priceDecimals
  )

  const baseTradingBalanceInBase = new BigNumberInWei(
    baseTradingBalance.value?.availableMargin || 0
  ).toBase(props.market.baseToken.decimals)

  const quoteTradingBalanceInBase = new BigNumberInWei(
    quoteTradingBalance.value?.availableMargin || 0
  ).toBase(props.market.quoteToken.decimals)

  if (props.market.type === MarketType.Derivative) {
    return quoteTradingBalanceInBase.gt(minOrderPrice)
  }

  return (
    quoteTradingBalanceInBase.gt(minOrderPrice) ||
    baseTradingBalanceInBase.gt(minOrderPrice)
  )
})

const baseTradingBalanceToFormat = computed(() => {
  return new BigNumberInWei(baseTradingBalance.value?.availableMargin || '0')
    .toBase(props.market.baseToken.decimals)
    .toFormat(props.market.quantityDecimals, BigNumberInBase.ROUND_DOWN)
})

const quoteTradingBalanceToFormat = computed(() => {
  return new BigNumberInWei(quoteTradingBalance.value?.availableMargin || '0')
    .toBase(props.market.quoteToken.decimals)
    .toFormat(props.market.priceDecimals, BigNumberInBase.ROUND_DOWN)
})

onWalletConnected(() => {
  status.setLoading()

  Promise.all([
    bankStore.fetchAccountPortfolio(),
    bankStore.streamBankBalance()
  ])
    .catch($onError)
    .finally(() => {
      status.setIdle()
    })
})

function handleDeposit() {
  const token = isSpot ? props.market.baseToken : props.market.quoteToken

  useEventBus<Token>(BridgeBusEvents.Deposit).emit(token)
}
</script>

<template>
  <AppPanel class="w-full">
    <div>
      <div class="flex items-center justify-between">
        <p class="text-xs text-gray-500 flex items-center">
          {{ $t('marketPage.assets') }}
        </p>
        <NuxtLink
          v-if="walletStore.isUserWalletConnected"
          :to="{ name: 'account' }"
          class="text-blue-500 text-2xs font-semibold"
        >
          {{ $t('marketPage.account') }}
        </NuxtLink>
      </div>
      <div v-if="walletStore.isUserWalletConnected" class="mt-4 relative">
        <AppHocLoading
          :show-loading="
            status.isLoading() ||
            walletStore.walletConnectStatus === WalletConnectStatus.connecting
          "
        >
          <div>
            <div v-if="!hasTradingAccountBalances">
              <p class="text-xs text-gray-500">
                {{ $t('marketPage.noTradingBalance') }}
              </p>

              <AppButton
                class="w-full rounded bg-blue-500 text-blue-900 mt-4"
                @click="handleDeposit"
              >
                <span>
                  {{ $t('common.deposit') }}
                </span>
              </AppButton>
            </div>

            <div v-else>
              <div
                v-if="isSpot"
                class="flex justify-between items-center text-xs mb-4"
              >
                <span class="text-gray-500">
                  {{
                    $t('trade.available_asset', {
                      asset: market.baseToken.symbol
                    })
                  }}
                </span>
                <span class="font-mono text-white">
                  {{ baseTradingBalanceToFormat }}
                </span>
              </div>

              <div class="flex justify-between items-center text-xs">
                <span class="text-gray-500">
                  {{
                    $t('trade.available_asset', {
                      asset: market.quoteToken.symbol
                    })
                  }}
                </span>
                <div class="flex gap-2">
                  <PartialsCommonBalancesPeggyUsdcConvert
                    v-if="market"
                    :market="market"
                  />
                  <span class="font-mono text-white">
                    {{ quoteTradingBalanceToFormat }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AppHocLoading>
      </div>
      <CommonUserNotConnectedNote v-else cta />
    </div>
  </AppPanel>
</template>
<script lang="ts" setup>
import { Campaign, CampaignUser } from '@injectivelabs/sdk-ts'
import {
  UiSpotMarketWithToken,
  ZERO_IN_BASE,
  getExplorerUrl
} from '@injectivelabs/sdk-ui-ts'
import { BigNumberInBase, BigNumberInWei } from '@injectivelabs/utils'
import {
  NETWORK,
  UI_DEFAULT_MIN_DISPLAY_DECIMALS,
  UI_DEFAULT_MAX_DISPLAY_DECIMALS
} from '@/app/utils/constants'
import { LP_CAMPAIGNS } from '@/app/data/campaign'

const props = defineProps({
  campaignUser: {
    type: Object as PropType<CampaignUser>,
    required: true
  },

  campaign: {
    type: Object as PropType<Campaign>,
    required: true
  },

  totalScore: {
    type: String,
    required: true
  },

  market: {
    type: Object as PropType<UiSpotMarketWithToken>,
    required: true
  }
})

const tokenStore = useTokenStore()

const explorerLink = `${getExplorerUrl(NETWORK)}/account/${
  props.campaignUser.accountAddress
}`

const { valueToString: volumeInUsdToString } = useBigNumberFormatter(
  computed(() =>
    new BigNumberInWei(props.campaignUser.score)
      .toBase(props.market.quoteToken.decimals)
      .times(tokenStore.tokenUsdPriceMap[props.market.quoteToken.coinGeckoId])
  )
)

const campaignWithSc = computed(() =>
  LP_CAMPAIGNS.find(
    ({ campaignId }) => campaignId === props.campaign.campaignId
  )
)

const estRewardsInPercentage = computed(() => {
  if (new BigNumberInBase(props.totalScore).isZero()) {
    return 0
  }

  return new BigNumberInBase(props.campaignUser.score).dividedBy(
    props.totalScore
  )
})

const rewards = computed(() => {
  if (!campaignWithSc.value) {
    return []
  }

  return campaignWithSc.value.rewards.map((reward) => {
    const token = tokenStore.tokens.find(
      ({ symbol }) => symbol === reward.symbol
    )

    const amount = new BigNumberInBase(
      estRewardsInPercentage.value
    ).multipliedBy(reward.amount || 0)

    const amountInUsd = token
      ? new BigNumberInBase(amount).times(
          tokenStore.tokenUsdPriceMap[token.coinGeckoId]
        )
      : ZERO_IN_BASE

    return {
      amount,
      symbol: reward.symbol,
      amountInUsd
    }
  })
})

const rewardsFormatted = computed(() =>
  rewards.value.map((reward) => ({
    amount: reward.amount.toFormat(
      reward.amount.isLessThan(0.1)
        ? UI_DEFAULT_MAX_DISPLAY_DECIMALS
        : UI_DEFAULT_MIN_DISPLAY_DECIMALS
    ),
    symbol: reward.symbol
  }))
)
</script>

<template>
  <tr class="border-b last:border-none hover:bg-gray-800 text-sm">
    <td>
      <div class="p-3">
        <NuxtLink :to="explorerLink" target="_blank">
          <p class="text-blue-500 truncate">
            {{ campaignUser.accountAddress }}
          </p>
        </NuxtLink>
      </div>
    </td>
    <td class="text-right">
      <div class="p-3">{{ volumeInUsdToString }} USD</div>
    </td>
    <td class="text-right">
      <div class="p-3">
        <p>
          <span
            v-for="({ amount, symbol }, i) in rewardsFormatted"
            :key="symbol"
          >
            {{ i > 0 ? ',' : '' }} {{ amount }} {{ symbol }}
          </span>
        </p>
      </div>
    </td>
  </tr>
</template>

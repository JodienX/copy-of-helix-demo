<script lang="ts" setup>
import { PropType, Ref } from 'vue'
import { BigNumberInBase } from '@injectivelabs/utils'
import { MarketType, UiPosition, ZERO_IN_BASE } from '@injectivelabs/sdk-ui-ts'
import { OrderSide } from '@injectivelabs/ts-types'
import {
  BusEvents,
  TradeForm,
  TradeField,
  UiMarketWithToken,
  TradeExecutionType,
  MaxAmountOnOrderbook,
  OrderBookPriceAndType,
  OrderBookNotionalAndType,
  OrderBookQuantityAndType
} from '@/types'

const formValues = useFormValues() as Ref<TradeForm>
const setFormValues = useSetFormValues()

const props = defineProps({
  isBuy: Boolean,
  isSpot: Boolean,
  isBaseAmount: Boolean,
  showReduceOnly: Boolean,
  isOrderTypeReduceOnly: Boolean,
  availableBalanceError: Boolean,
  markPriceThresholdError: Boolean,
  initialMinMarginRequirementError: Boolean,

  baseAvailableBalance: {
    type: Object as PropType<BigNumberInBase> | undefined,
    default: undefined
  },

  executionPrice: {
    type: Object as PropType<BigNumberInBase>,
    required: true
  },

  feeRate: {
    type: Object as PropType<BigNumberInBase>,
    default: ZERO_IN_BASE
  },

  fees: {
    type: Object as PropType<BigNumberInBase>,
    default: undefined
  },

  lastTradedPrice: {
    type: Object as PropType<BigNumberInBase>,
    required: true
  },

  market: {
    type: Object as PropType<UiMarketWithToken>,
    required: true
  },

  maxAmountOnOrderbook: {
    type: Object as PropType<MaxAmountOnOrderbook>,
    required: true
  },

  maxReduceOnly: {
    type: Object as PropType<BigNumberInBase | undefined>,
    default: undefined
  },

  position: {
    type: Object as PropType<UiPosition> | undefined,
    default: undefined
  },

  quoteAvailableBalance: {
    type: Object as PropType<BigNumberInBase>,
    required: true
  },

  worstPriceWithSlippage: {
    type: Object as PropType<BigNumberInBase>,
    required: true
  }
})

const emit = defineEmits<{
  'update:amount': [props: { amount?: string; isBaseAmount: boolean }]
}>()

const isSpot = props.market.type === MarketType.Spot

onMounted(() => {
  useEventBus<OrderBookPriceAndType>(BusEvents.OrderbookPriceClick).on(
    onOrderbookPriceClick
  )
  useEventBus<OrderBookQuantityAndType>(BusEvents.OrderbookSizeClick).on(
    onOrderbookSizeClick
  )
  useEventBus<OrderBookNotionalAndType>(BusEvents.OrderbookNotionalClick).on(
    onOrderbookNotionalClick
  )
})

function updateAmount({
  amount,
  isBaseAmount
}: {
  amount?: string
  isBaseAmount: boolean
}) {
  emit('update:amount', { amount, isBaseAmount })
}

function updateOrderSide(isBuy: boolean) {
  setFormValues(
    {
      [TradeField.OrderSide]: isBuy ? OrderSide.Sell : OrderSide.Buy
    },
    false
  )
}

function onOrderbookNotionalClick(notionalAndType: OrderBookNotionalAndType) {
  updateOrderSide(notionalAndType.isBuy)

  setFormValues(
    {
      [TradeField.TradingType]: TradeExecutionType.Market,
      [TradeField.QuoteAmount]: notionalAndType.total
    },
    false
  )

  updateAmount({ isBaseAmount: false })
}

function onOrderbookSizeClick(quantityAndOrderSide: OrderBookQuantityAndType) {
  updateOrderSide(quantityAndOrderSide.isBuy)

  setFormValues({
    [TradeField.BaseAmount]: quantityAndOrderSide.quantity
  })

  updateAmount({ isBaseAmount: true })
}

function onOrderbookPriceClick(priceAndOrderSide: OrderBookPriceAndType) {
  if (
    formValues.value[TradeField.TradingType] === TradeExecutionType.LimitFill ||
    formValues.value[TradeField.TradingType] === TradeExecutionType.StopLimit
  ) {
    setFormValues({
      [TradeField.LimitPrice]: priceAndOrderSide.price
    })

    updateAmount({ isBaseAmount: true })
  }
}
</script>

<template>
  <div>
    <PartialsTradingFormInputs
      v-bind="{
        fees,
        isBuy,
        isSpot,
        market,
        feeRate,
        position,
        isBaseAmount,
        maxReduceOnly,
        lastTradedPrice,
        isOrderTypeReduceOnly,
        baseAvailableBalance,
        maxAmountOnOrderbook,
        quoteAvailableBalance
      }"
      @update:amount="updateAmount"
    />

    <PartialsTradingFormInputError
      v-bind="{
        isBuy,
        isSpot,
        maxReduceOnly,
        isOrderTypeReduceOnly,
        baseAvailableBalance,
        maxAmountOnOrderbook,
        availableBalanceError,
        quoteAvailableBalance,
        markPriceThresholdError,
        initialMinMarginRequirementError
      }"
    />

    <PartialsTradingDerivativesTradingOrderLeverage
      v-show="
        !isOrderTypeReduceOnly &&
        !isSpot &&
        market.subType !== MarketType.BinaryOptions
      "
      class="mt-6"
      v-bind="{
        isBuy,
        market,
        executionPrice,
        worstPriceWithSlippage,
        leverageFieldName: TradeField.Leverage
      }"
    />

    <PartialsTradingFormAdvancedSettings
      v-bind="{
        isSpot,
        reduceOnlyDisabled: !showReduceOnly
      }"
      @update:amount="updateAmount"
    />
  </div>
</template>

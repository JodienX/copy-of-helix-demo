<template>
  <main>
    <PartialsInstitutionalNavbar />
    <slot />
    <PartialsInstitutionalFooter />

    <BaseNotifications
      class="z-[1110] fixed inset-0 flex flex-col gap-2 justify-end items-end p-6 pointer-events-none"
    >
      <template #notification="{ notification }">
        <BaseNotification
          :notification="notification"
          class="pointer-events-auto bg-gray-800"
        >
          <template #close="{ closeNotification }">
            <BaseIcon
              name="close-bold"
              class="min-w-4 hover:text-blue-500 text-white w-4 h-4"
              @click="closeNotification"
            />
          </template>
        </BaseNotification>
      </template>
    </BaseNotifications>
  </main>
</template>

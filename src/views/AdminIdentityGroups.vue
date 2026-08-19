<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import {Layers} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppPagination from '@/components/AppPagination.vue'
import {Card, CardContent} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {getIdentityGroups, type IdentityGroup} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'

const groups = ref<IdentityGroup[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const loadError = ref('')

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getIdentityGroups({page: page.value, pageSize})
    groups.value = res.groups
    total.value = res.total
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载身份组失败。')
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="身份组" description="自定义角色（身份组）列表。组的新建 / 改名 / 删除与用户分配在管理后台。"/>

    <Card>
      <CardContent class="p-4">
        <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {{ loadError }}
        </div>

        <div v-if="loading" class="space-y-3">
          <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-muted"/>
        </div>

        <div v-else-if="groups.length === 0" class="flex flex-col items-center gap-3 py-12 text-center">
          <Layers class="h-10 w-10 text-muted-foreground/50"/>
          <p class="text-sm text-muted-foreground">暂无身份组</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[480px] text-sm">
            <thead>
            <tr class="border-b text-left text-xs text-muted-foreground">
              <th class="py-2 pr-4">名称</th>
              <th class="py-2 pr-4">展示名</th>
              <th class="py-2">ID</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="group in groups" :key="group.id" class="border-b last:border-0">
              <td class="py-2 pr-4 font-medium">{{ group.name }}</td>
              <td class="py-2 pr-4">
                <Badge variant="secondary">{{ group.displayName || '-' }}</Badge>
              </td>
              <td class="py-2 font-mono text-xs text-muted-foreground">{{ group.id }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex justify-center">
          <AppPagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="load"/>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
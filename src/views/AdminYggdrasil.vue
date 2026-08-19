<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import {ImageOff, Package} from 'lucide-vue-next'
import AppPageHeader from '@/components/AppPageHeader.vue'
import AppPagination from '@/components/AppPagination.vue'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {
  deleteManagedTexture,
  getManagedProfiles,
  getManagedProfile,
  getManagedTextures,
  type ManagedProfile,
  type ManagedTexture,
} from '@/api'
import {extractErrorMessage} from '@/lib/apiError'
import {formatDateTime} from '@/lib/format'

// ============ 角色列表 ============
const profiles = ref<ManagedProfile[]>([])
const profileDetail = ref<Record<string, string[]>>({})
const profileTotal = ref(0)
const profilePage = ref(1)
const userIdFilter = ref('')
const profilesLoading = ref(true)
const profilesError = ref('')

// ============ 材质列表 ============
const textures = ref<ManagedTexture[]>([])
const textureTotal = ref(0)
const texturePage = ref(1)
const orphanOnly = ref(true)
const texturesLoading = ref(true)
const texturesError = ref('')
const deletingHash = ref('')

async function loadProfiles(): Promise<void> {
  profilesLoading.value = true
  profilesError.value = ''
  try {
    const res = await getManagedProfiles({
      page: profilePage.value,
      pageSize: 10,
      userId: userIdFilter.value || undefined
    })
    profiles.value = res.items
    profileTotal.value = res.total
    // 并行拉取详情以展示材质摘要（失败不影响列表）
    const details = await Promise.allSettled(res.items.map(p => getManagedProfile(p.id)))
    const map: Record<string, string[]> = {}
    details.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        map[res.items[index].id] = result.value.textures.map(t => `${t.textureType}${t.model ? `(${t.model})` : ''}`)
      }
    })
    profileDetail.value = map
  } catch (e) {
    profilesError.value = extractErrorMessage(e, '加载角色列表失败。')
  } finally {
    profilesLoading.value = false
  }
}

async function loadTextures(): Promise<void> {
  texturesLoading.value = true
  texturesError.value = ''
  try {
    const res = await getManagedTextures({
      page: texturePage.value,
      pageSize: 10,
      orphanOnly: orphanOnly.value
    })
    textures.value = res.items
    textureTotal.value = res.total
  } catch (e) {
    texturesError.value = extractErrorMessage(e, '加载材质列表失败。')
  } finally {
    texturesLoading.value = false
  }
}

async function handleDeleteTexture(hash: string): Promise<void> {
  if (!window.confirm(`确定删除材质 ${hash.slice(0, 12)}… 吗？此操作不可恢复。`)) return
  deletingHash.value = hash
  try {
    await deleteManagedTexture(hash)
    await loadTextures()
  } catch (e) {
    texturesError.value = extractErrorMessage(e, '删除材质失败。')
  } finally {
    deletingHash.value = ''
  }
}

onMounted(() => {
  void loadProfiles()
  void loadTextures()
})
</script>

<template>
  <div class="space-y-6 p-4 md:p-8 pt-6">
    <AppPageHeader title="Yggdrasil 资源" description="管理全服角色与材质文件（纹理）。材质仅允许删除孤儿文件。"/>

    <Tabs default-value="profiles" class="space-y-4">
      <TabsList class="grid w-full max-w-sm grid-cols-2">
        <TabsTrigger value="profiles">角色</TabsTrigger>
        <TabsTrigger value="textures">材质</TabsTrigger>
      </TabsList>

      <TabsContent value="profiles">
        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center gap-2">
              <Package class="h-4 w-4 text-primary"/>
              <CardTitle class="text-base">角色列表</CardTitle>
              <div class="ml-auto flex gap-2">
                <Label class="sr-only" for="userId">用户 ID</Label>
                <Input id="userId" v-model="userIdFilter" class="w-56" placeholder="按用户 ID 过滤"/>
                <Button size="sm" variant="outline" @click="profilePage = 1; loadProfiles()">过滤</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-if="profilesError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {{ profilesError }}
            </div>
            <div v-if="profilesLoading" class="space-y-3">
              <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-muted"/>
            </div>
            <div v-else-if="profiles.length === 0" class="py-10 text-center text-sm text-muted-foreground">
              暂无角色
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full min-w-[640px] text-sm">
                <thead>
                <tr class="border-b text-left text-xs text-muted-foreground">
                  <th class="py-2 pr-4">名称</th>
                  <th class="py-2 pr-4">模型</th>
                  <th class="py-2 pr-4">材质</th>
                  <th class="py-2 pr-4">用户 ID</th>
                  <th class="py-2 pr-4">更新时间</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="profile in profiles" :key="profile.id" class="border-b last:border-0">
                  <td class="py-2 pr-4 font-medium">{{ profile.name }}</td>
                  <td class="py-2 pr-4">
                    <Badge variant="secondary">{{ profile.model === 'slim' ? '纤细' : '默认' }}</Badge>
                  </td>
                  <td class="py-2 pr-4">
                    <span v-if="profileDetail[profile.id]?.length" class="text-xs">
                      {{ profileDetail[profile.id].join(', ') }}
                    </span>
                    <span v-else class="text-xs text-muted-foreground">无</span>
                  </td>
                  <td class="py-2 pr-4 font-mono text-xs">{{ profile.userId }}</td>
                  <td class="py-2 pr-4 text-muted-foreground">{{ formatDateTime(profile.updatedAt) }}</td>
                </tr>
                </tbody>
              </table>
            </div>
            <div class="flex justify-center">
              <AppPagination v-model:page="profilePage" :page-size="10" :total="profileTotal" @update:page="loadProfiles"/>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="textures">
        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center gap-2">
              <ImageOff class="h-4 w-4 text-primary"/>
              <CardTitle class="text-base">材质文件</CardTitle>
              <label class="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <input
                    v-model="orphanOnly"
                    type="checkbox"
                    class="h-4 w-4 accent-primary"
                    @change="texturePage = 1; loadTextures()"
                />
                仅孤儿材质
              </label>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-if="texturesError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {{ texturesError }}
            </div>
            <div v-if="texturesLoading" class="space-y-3">
              <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-muted"/>
            </div>
            <div v-else-if="textures.length === 0" class="py-10 text-center text-sm text-muted-foreground">
              暂无材质文件
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full min-w-[560px] text-sm">
                <thead>
                <tr class="border-b text-left text-xs text-muted-foreground">
                  <th class="py-2 pr-4">Hash</th>
                  <th class="py-2 pr-4">类型</th>
                  <th class="py-2 pr-4">归属</th>
                  <th class="py-2 text-right">操作</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="texture in textures" :key="texture.hash" class="border-b last:border-0">
                  <td class="max-w-[200px] truncate py-2 pr-4 font-mono text-xs">{{ texture.hash }}</td>
                  <td class="py-2 pr-4">
                    <Badge :variant="texture.textureType === 'skin' ? 'info' : 'warning'">
                      {{ texture.textureType === 'skin' ? '皮肤' : '披风' }}
                    </Badge>
                  </td>
                  <td class="py-2 pr-4 text-xs">
                    <Badge v-if="texture.orphan" variant="destructive">孤儿</Badge>
                    <span v-else class="font-mono text-muted-foreground">{{ texture.profileId }}</span>
                  </td>
                  <td class="py-2 text-right">
                    <Button
                        size="sm"
                        variant="destructive"
                        :disabled="!texture.orphan || deletingHash === texture.hash"
                        @click="handleDeleteTexture(texture.hash)"
                    >
                      {{ deletingHash === texture.hash ? '删除中...' : '删除' }}
                    </Button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
            <div class="flex justify-center">
              <AppPagination v-model:page="texturePage" :page-size="10" :total="textureTotal" @update:page="loadTextures"/>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
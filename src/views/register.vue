<script lang="ts" setup>
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import AuthShell from '@/components/AuthShell.vue';
import {registerUser, sendRegisterEmailCode} from '@/api';
import {withCaptcha} from '@/composables/useCaptcha';
import {extractErrorMessage} from '@/lib/apiError';

const email = ref('');
const emailCode = ref('');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const message = ref('');
const isError = ref(false);
const isLoading = ref(false);
const isSendingCode = ref(false);
const captchaEl = ref<HTMLDivElement | null>(null);
const router = useRouter();

const handleSendCode = async () => {
  if (!email.value) {
    message.value = '请先填写邮箱。';
    isError.value = true;
    return;
  }
  isSendingCode.value = true;
  message.value = '';
  isError.value = false;
  try {
    await withCaptcha('email-code-register', () => captchaEl.value, async (headers) => {
      await sendRegisterEmailCode(email.value, headers);
    });
    message.value = '验证码已发送到您的邮箱。';
  } catch (error) {
    console.error('发送验证码失败:', error);
    message.value = extractErrorMessage(error, '验证码发送失败，请重试。');
    isError.value = true;
  } finally {
    isSendingCode.value = false;
  }
};

const handleRegister = async () => {
  message.value = '';
  isError.value = false;

  if (!email.value || !emailCode.value || !password.value || !confirmPassword.value || !username.value) {
    message.value = '所有字段都是必填项。';
    isError.value = true;
    return;
  }
  if (password.value !== confirmPassword.value) {
    message.value = '两次输入的密码不一致。';
    isError.value = true;
    return;
  }

  isLoading.value = true;
  try {
    await withCaptcha('register', () => captchaEl.value, async (headers) => {
      await registerUser(email.value, password.value, emailCode.value, username.value, headers);
    });
    message.value = '账户创建成功！正在跳转到登录页...';
    isError.value = false;
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (error) {
    console.error('注册失败:', error);
    message.value = extractErrorMessage(error, '注册失败。请重试。');
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <AuthShell title="创建账户" description="使用邮箱注册新账户，开启您的 Minecraft 外置登录之旅。">
    <Card class="w-full border-border/60 shadow-xl shadow-black/5 backdrop-blur">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">创建账户</CardTitle>
        <CardDescription>输入邮箱、验证码、用户名与密码开始。</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-2">
          <Label for="email">邮箱</Label>
          <div class="flex gap-2">
            <Input id="email" v-model="email" placeholder="m@example.com" required type="email"/>
            <Button :disabled="isSendingCode" type="button" variant="outline" @click="handleSendCode">
              {{ isSendingCode ? '发送中...' : '获取验证码' }}
            </Button>
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="email-code">邮箱验证码</Label>
          <Input id="email-code" v-model="emailCode" placeholder="请输入验证码" required type="text"/>
        </div>
        <div class="grid gap-2">
          <Label for="username">用户名</Label>
          <Input id="username" v-model="username" placeholder="登录后对外展示的名称" required type="text" autocomplete="username"/>
        </div>
        <div class="grid gap-2">
          <Label for="password">密码</Label>
          <Input id="password" v-model="password" type="password" required autocomplete="new-password"/>
          <p class="text-xs text-muted-foreground">需包含字母和数字且不少于 6 位。</p>
        </div>
        <div class="grid gap-2">
          <Label for="confirm-password">确认密码</Label>
          <Input id="confirm-password" v-model="confirmPassword" type="password" required autocomplete="new-password"/>
        </div>

        <!-- 人机验证挂载点 -->
        <div ref="captchaEl" class="min-h-0"/>

        <div v-if="message" :class="['text-sm font-medium', isError ? 'text-destructive' : 'text-primary']">
          {{ message }}
        </div>
        <Button type="submit" class="w-full" :disabled="isLoading" @click="handleRegister">
          {{ isLoading ? '正在创建账户...' : '创建账户' }}
        </Button>
      </CardContent>
      <CardFooter class="text-center text-sm">
        已经有账户了？
        <router-link to="/login" class="underline ml-1">
          登录
        </router-link>
      </CardFooter>
    </Card>
  </AuthShell>
</template>
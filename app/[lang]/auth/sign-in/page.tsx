/**
 * Страница входа (Sign In)
 *
 * Форма авторизации с email и password.
 * Использует NextAuth signIn для авторизации через Credentials provider.
 */

'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Form, Input, Button, Alert, Typography } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import styles from './sign-in.module.scss';

const { Title, Text } = Typography;

interface SignInFormValues {
  email: string;
  password: string;
}

/**
 * Компонент страницы входа
 */
export const SignInPage: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/en';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async (values: SignInFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
        callbackUrl,
      });

      if (result?.error) {
        // Обработка ошибок от NextAuth
        setError(result.error);
      } else if (result?.ok) {
        // Успешная авторизация - редирект
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <Title level={2}>Sign In</Title>
          <Text type="secondary">Enter your credentials to access your account</Text>
        </div>

        {error && (
          <Alert
            message="Authentication Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            className={styles.alert}
          />
        )}

        <Form
          name="sign-in"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          size="large"
          className={styles.form}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="user@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading} block>
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.footer}>
          <Text type="secondary">Don&apos;t have an account? Contact administrator</Text>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;

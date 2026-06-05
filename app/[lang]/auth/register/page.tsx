/**
 * Register Page
 *
 * Registration form with email and password.
 * Registers user via API and redirects to sign-in page.
 */

'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { LockOutlined, MailOutlined, BookOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Form, Input, Alert, Typography } from 'antd';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { httpPost } from '@/lib/http';
import styles from './register.module.scss';

const { Title, Text } = Typography;

interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Register page component
 */
const RegisterPage: FC = () => {
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || 'en';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Form submission handler
   */
  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call backend auth register
      await httpPost('/auth/register', {
        email: values.email,
        password: values.password,
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Sidebar - Brand Identity */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <div className={styles.brand}>
            <BookOutlined className={styles.logoIcon} />
            <span className={styles.brandName}>BIBLIARIS</span>
          </div>
          <p className={styles.tagline}>
            Your digital library awaits. Thousands of books and audiobooks at your fingertips.
          </p>
          <div className={styles.featuresList}>
            {[
              'Access thousands of books instantly',
              'Listen to audiobooks anywhere',
              'Track your reading progress',
              'Build your personal bookshelf',
            ].map((feat) => (
              <div key={feat} className={styles.featureItem}>
                <CheckCircleOutlined className={styles.checkIcon} />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          {/* Mobile Header */}
          <div className={styles.mobileHeader}>
            <BookOutlined className={styles.logoIcon} />
            <span className={styles.brandName}>BIBLIARIS</span>
          </div>

          {isSuccess ? (
            <div className={styles.successScreen}>
              <CheckCircleOutlined className={styles.successIcon} />
              <Title level={2} className={styles.successTitle}>
                Account Created!
              </Title>
              <Text className={styles.successText}>
                Your account has been successfully created. You can now sign in using your
                credentials.
              </Text>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => router.push(`/${lang}/auth/sign-in`)}
              >
                Go to Sign In
              </Button>
            </div>
          ) : (
            <>
              <Title level={2} className={styles.title}>
                Create your account
              </Title>
              <Text className={styles.subtitle}>Join thousands of readers on Bibliaris</Text>

              {error && (
                <Alert
                  message="Registration Error"
                  description={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                  className={styles.alert}
                />
              )}

              <Form
                name="register"
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
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter your password' },
                    { min: 6, message: 'Password must be at least 6 characters' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="Confirm Password"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Please confirm your password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Form.Item>
                  <Button variant="primary" type="submit" loading={isLoading} fullWidth>
                    Create Account
                  </Button>
                </Form.Item>
              </Form>

              <div className={styles.footer}>
                Already have an account? <Link href={`/${lang}/auth/sign-in`}>Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

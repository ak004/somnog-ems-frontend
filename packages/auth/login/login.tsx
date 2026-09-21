"use client"
import {
  AlipayCircleOutlined,
  LockOutlined,
  MobileOutlined,
  TaobaoCircleOutlined,
  UserOutlined,
  WeiboCircleOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProConfigProvider,
  ProFormCaptcha,
  ProFormCheckbox,
  ProFormText,
  setAlpha,
} from '@ant-design/pro-components';
import { Image, Space, Tabs, message, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import apiConfig from '@/shared/apiconfig';
import { apiMessage } from '@/shared/apiError';
import { useAuth } from '@/packages/auth/context/context';

type LoginType = 'signin' | 'signup';

type LoginFormValues = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

const Demo = () => {
  const { token } = theme.useToken();
  const [loginType, setLoginType] = useState<LoginType>('signin');
  const router = useRouter();
  const { setIsLoggedIn, setUser } = useAuth();

  const onFinish = async (values: LoginFormValues) => {
    try {
      const { data } = await apiConfig.post(
        loginType === 'signin' ? '/api/auth/login' : '/api/auth/register',
        values,
      );

      if (loginType === 'signin') {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);
        setIsLoggedIn(true);
        message.success('Login successful');
        router.push('/dashboard');
      } else {
        message.success('Account created. Check MailHog to verify your email.');
      }
      return true;
    } catch (error: unknown) {
      message.error(apiMessage(error, 'Request failed'));
      return false;
    }
  };

  return (
    <ProConfigProvider hashed={false}>
      <div style={{ backgroundColor: token.colorBgContainer }}>
        <LoginForm
          logo={<Image src="/logo.png" alt="logo" width={100}  />}

          subTitle="Sign in to your account V2"
          
          onFinish={onFinish}

          submitter={{
            searchConfig: {
              submitText: 'Submit',
            },
          }}
        >
          <Tabs
            centered
            activeKey={loginType}
            onChange={(activeKey) => setLoginType(activeKey as LoginType)}
            items={[
              { key: 'signin', label: 'Sign in' },
              { key: 'signup', label: 'Sign up' },
            ]}
          />
          {loginType === 'signin' && (
            <>
              <ProFormText
                name="email"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined className={'prefixIcon'} />,
                }}
                placeholder={'Email'}
                rules={[
                  {
                    required: true,
                    message: 'Please enter your email!',
                  },
                  {
                    type: 'email',
                    message: 'Invalid email format!',
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined className={'prefixIcon'} />,
                }}
                placeholder={'Password'}
                rules={[
                  {
                    required: true,
                    message: 'Please enter your password!',
                  },
                ]}
              />
            </>
          )}
          {loginType === 'signup' && (
           <>
           <ProFormText
             name="firstName"
             fieldProps={{
               size: 'large',
               prefix: <UserOutlined className={'prefixIcon'} />,
             }}
             placeholder={'First Name'}
             rules={[
               {
                 required: true,
                 message: 'Please enter your first name!',
               },
               {
                 type: 'string',
                 message: 'Invalid first name format!',
               },
             ]}
           />

<ProFormText
             name="lastName"
             fieldProps={{
               size: 'large',
               prefix: <UserOutlined className={'prefixIcon'} />,
             }}
             placeholder={'Last Name'}
             rules={[
               {
                 required: true,
                 message: 'Please enter your last name!',
               },
               {
                 type: 'string',
                 message: 'Invalid last name format!',
               },
             ]}
           />

<ProFormText
             name="email"
             fieldProps={{
               size: 'large',
               prefix: <UserOutlined className={'prefixIcon'} />,
             }}
             placeholder={'Email'}
             rules={[
               {
                 required: true,
                 message: 'Please enter your email!',
               },
               {
                 type: 'email',
                 message: 'Invalid email format!',
               },
             ]}
           />
           <ProFormText.Password
             name="password"
             fieldProps={{
               size: 'large',
               prefix: <LockOutlined className={'prefixIcon'} />,
               strengthText:
                 'Password should contain numbers, letters and special characters, at least 8 characters long.',
               statusRender: (value) => {
                 const getStatus = () => {
                   if (value && value.length > 12) {
                     return 'ok';
                   }
                   if (value && value.length > 6) {
                     return 'pass';
                   }
                   return 'poor';
                 };
                 const status = getStatus();
                 if (status === 'pass') {
                   return (
                     <div style={{ color: token.colorWarning }}>
                      Strength: Medium
                     </div>
                   );
                 }
                 if (status === 'ok') {
                   return (
                     <div style={{ color: token.colorSuccess }}>
                      Strength: Strong
                     </div>
                   );
                 }
                 return (
                   <div style={{ color: token.colorError }}>Strength: Weak</div>
                 );
               },
             }}
             placeholder={'Password'}
             rules={[
               {
                 required: true,
                 message: 'Please enter your password!',
               },
             ]}
           />
         </>
          )}
          
        </LoginForm>
      </div>
    </ProConfigProvider>
  );
};

function LoginPage() {
  return (
    <div style={{ padding: 24 }}>
      <Demo />
    </div>
  );
}

export default LoginPage;
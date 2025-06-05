export interface INavigationRoute {
  name: string
  displayName: string
  meta: { icon: string }
  children?: INavigationRoute[]
}

export default {
  root: {
    name: '/',
    displayName: 'navigationRoutes.home',
  },
  routes: [
    {
      name: 'business',
      displayName: '영업',
      meta: {
        icon: 'group',
      },
      children: [
        {
          name: 'order-list',
          displayName: '주문 조회',
        },
        {
          name: 'order-management',
          displayName: '주문 관리',
        },
        {
          name: 'billing',
          displayName: 'menu.billing',
        },
      ],
    },
    {
      name: 'facility',
      displayName: '설비',
      meta: {
        icon: 'folder_shared',
      },
      children: [
        {
          name: 'payment-methods',
          displayName: 'menu.payment-methods',
        },
        {
          name: 'pricing-plans',
          displayName: 'menu.pricing-plans',
        },
        {
          name: 'billing',
          displayName: 'menu.billing',
        },
      ],
    },
    {
      name: 'material',
      displayName: '자재',
      meta: {
        icon: 'credit_card',
      },
      children: [
        {
          name: 'payment-methods',
          displayName: 'menu.payment-methods',
        },
        {
          name: 'pricing-plans',
          displayName: 'menu.pricing-plans',
        },
        {
          name: 'billing',
          displayName: 'menu.billing',
        },
      ],
    },
    {
      name: 'production',
      displayName: '생산',
      meta: {
        icon: 'login',
      },
      children: [
        {
          name: 'login',
          displayName: 'menu.login',
        },
        {
          name: 'signup',
          displayName: 'menu.signup',
        },
        {
          name: 'recover-password',
          displayName: 'menu.recover-password',
        },
      ],
    },

    {
      name: 'packaging',
      displayName: '포장',
      meta: {
        icon: 'quiz',
      },
      children: [
        {
          name: 'payment-methods',
          displayName: 'menu.payment-methods',
        },
        {
          name: 'pricing-plans',
          displayName: 'menu.pricing-plans',
        },
        {
          name: 'billing',
          displayName: 'menu.billing',
        },
      ],
    },
    {
      name: 'quality',
      displayName: '품질',
      meta: {
        icon: 'vuestic-iconset-files',
      },
      children: [
        {
          name: 'payment-methods',
          displayName: 'menu.payment-methods',
        },
        {
          name: 'pricing-plans',
          displayName: 'menu.pricing-plans',
        },
        {
          name: 'billing',
          displayName: 'menu.billing',
        },
      ],
    },
    {
      name: 'distribution',
      displayName: '물류',
      meta: {
        icon: 'manage_accounts',
      },
      children: [
        {
          name: 'payment-methods',
          displayName: 'menu.payment-methods',
        },
        {
          name: 'pricing-plans',
          displayName: 'menu.pricing-plans',
        },
        {
          name: 'billing',
          displayName: 'menu.billing',
        },
      ],
    },
    {
      name: 'Standard information',
      displayName: '기준정보',
      meta: {
        icon: 'settings',
      },
      children: [
        {
          name: 'product management',
          displayName: '제품 관리',
        },
        {
          name: 'pricing-plans',
          displayName: '자재 관리',
        },
        {
          name: 'billing',
          displayName: '공정흐름도 관리',
        },
        {
          name: 'billing',
          displayName: '공정흐름도 조회',
        },
        {
          name: 'account-management',
          displayName: '거래처 관리',
        },
        {
          name: 'staff-management',
          displayName: '사원 관리',
        },
      ],
    },
  ] as INavigationRoute[],
}

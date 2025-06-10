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
      displayName: 'menu.영업',
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
      ],
    },
       {
    name: 'facility',
    displayName: 'menu.설비',
    meta: {
      icon: 'settings',
    },
    disabled: false,
    children: [
      {
        name: 'equipment-inquiry',
        displayName: 'menu.설비 조회',
        meta: {
          icon: 'search',
        },
      },
      {
        name: 'equipment-management', 
        displayName: 'menu.설비 관리',
        meta: {
          icon: 'build',
          },
        },
      ],
    },
    {
      name: 'material',
      displayName: 'menu.자재',
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
      displayName: 'menu.생산',
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
      displayName: 'menu.포장',
      meta: {
        icon: 'inventory_2',
      },
      children: [
        {
          name: 'package_line',     
          displayName: '포장 라인 선택/조회',
        },
        {
          name: 'package_work',   
          displayName: '포장 작업 수행',
        },
        {
          name: 'package_status',         
          displayName: '포장 작업 현황',
        },
      ],
    },
    {
      name: 'quality',
      displayName: 'menu.품질',
      meta: {
        icon: 'vuestic-iconset-files',
      },
      children: [
        {
          name: 'quality management',
          displayName: 'menu.품질관리',
        },
        {
          name: 'faulty management',
          displayName: 'menu.불량품검사 등록',
        },
                {
          name: 'faultyDisuse management',
          displayName: 'menu.불량품폐기 등록',
        },
      ],
    },
    {
      name: 'distribution',
      displayName: 'menu.물류',
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
      displayName: 'menu.기준정보',
      meta: {
        icon: 'settings',
      },
      children: [
        {
          name: 'product management',
          displayName: 'menu.제품 관리',
        },
        {
          name: 'material management',
          displayName: 'menu.자재 관리',
        },
        {
          name: 'process flow chart management',
          displayName: 'menu.공정흐름도 관리',
        },
        {
          name: 'equipment-register',
          displayName: 'menu.설비 등록',
        },
        {
          name: 'account-management',
          displayName: 'menu.거래처 관리',
        },
        {
          name: 'staff-management',
          displayName: 'menu.사원 관리',
        },
        {
          name: 'bom-manager',
          displayName: 'menu.BOM 관리',
        },
        {
          name: 'bom-manager',
          displayName: 'menu.BOM 관리',
        },
        {
          name: 'account-management',
          displayName: 'menu.거래처 관리',
        },
        {
          name: 'staff-management',
          displayName: 'menu.사원 관리',
        },
        {
          name: 'InspectionManagement',
          displayName: 'menu.검사항목 관리',
        },
                {
          name: 'defectManagement',
          displayName: 'menu.불량유형 관리',
        },
      ],
    },
  ] as INavigationRoute[],
}

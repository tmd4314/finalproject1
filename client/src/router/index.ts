import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'

import RouteViewComponent from '../layouts/RouterBypass.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'dashboard' },
  },
  {
    name: 'admin',
    path: '/',
    component: AppLayout,
    redirect: { name: 'dashboard' },
    children: [
      {
        name: 'dashboard',
        path: 'dashboard',
        component: () => import('../pages/admin/dashboard/Dashboard.vue'),
      },
      {
        name: 'quality',
        path: 'quality',
        component: RouteViewComponent,
        children: [
          { 
            name: 'quality management',
            path: 'quality management',
            component: () => import('../pages/quality/QualityListPage.vue'),
          },
          {
            name: 'faulty management',
            path: 'faulty management',
            component: () => import('../pages/quality/faultyInsertPage.vue'),
          },
          {
            name: 'faultyDisuse management',
            path: 'faultyDisuse management',
            component: () => import('../pages/quality/faultyDisuseInsertPage.vue'),
          },
        ],
      },
      {
        name: 'packaging',
        path: 'packaging',  
        component: RouteViewComponent,
        children: [
          { 
            name: 'package_work',
            path: 'work',
            component: () => import('../pages/package/PackageWork.vue'),
          },
          {
            name: 'package_line',
            path: 'line',
            component: () => import('../pages/package/PackageLine.vue'),
          },
          {
            name: 'package_status',
            path: 'status',
            component: () => import('../pages/package/PackageStatus.vue'),
          },
        ],
      },
      {
        name: 'Standard information',
        path: 'settings',
        component: RouteViewComponent,
        children: [
          {
            name: 'product management',
            path: 'product management',
            component: () => import('../pages/product/ProductPage.vue'),
          },
          {
            name: 'bom-manager',
            path: 'bom-manager',
            component: () => import('../pages/bom/BomManager.vue'),
          },
          {
            name: 'material management',
            path: 'material management',
            component: () => import('../pages/material/MaterialPage.vue'),
          },
          {
            name: 'process flow chart management',
            path: 'process flow chart management',
            component: () => import('../pages/process/processPage.vue'),
          },
          {
            name: 'pricing-plans',
            path: 'pricing-plans',
            component: () => import('../pages/pricing-plans/PricingPlans.vue'),
          },
            {
            name: 'equipment-register',
            path: 'equipment-register',
            component: () => import('../pages/equipment/EquipmentForm.vue'),
            },
             {
            name: 'InspectionManagement',
            path: 'InspectionManagement',
            component: () => import('../pages/quality/InspectionManager.vue'),
            },
                         {
            name: 'defectManagement',
            path: 'defectManagement',
            component: () => import('../pages/quality/defectManager.vue'),
            },
        ],
      },
      {
        name: 'distribution',
        path: 'distribution',
        component: () => import('../pages/preferences/Preferences.vue'),
      },
      {
        name: 'material',
        path: 'material',
        component: RouteViewComponent,
        children: [
          {
            name: 'receiving-management',
            path: 'receiving-management',
            component: () => import('../pages/material/receivingManagementPage.vue'),
          },
          {
            name: 'material-check',
            path: 'material-check',
            component: () => import('../pages/admin/staff/StaffManagePage.vue'),
          },
          {
            name: 'mrp-calculation',
            path: 'mrp-calculation',
            component: () => import('../pages/admin/order/OrderManagePage.vue'),
          },
          {
            name: 'receiving-check',
            path: 'receiving-check',
            component: () => import('../pages/material/LotCheckPage.vue'),
          },
          {
            name: 'order-management',
            path: 'order-management',
            component: () => import('../pages/payments/PaymentsPage.vue'),
          },
          {
            name: 'order-check',
            path: 'order-check',
            component: () => import('../pages/admin/staff/StaffManagePage.vue'),
          },
          {
            name: 'delivery-management',
            path: 'delivery-management',
            component: () => import('../pages/billing/BillingPage.vue'),
          },
          {
            name: 'delivery-check',
            path: 'delivery-check',
            component: () => import('../pages/pricing-plans/PricingPlans.vue'),
          },
        ],
      },
      {
      name: 'facility',
      path: 'facility',
      component: RouteViewComponent,
      children: [
        {
          name: 'equipment-inquiry',
          path: 'inquiry',
          component: () => import('../pages/equipment/EquipmentInquiry.vue'),
        },
        {
          name: 'equipment-management',
          path: 'management',
          component: () => import('../pages/equipment/EquipmentManagement.vue'),
        },
        {
          name: 'equipment-edit',
          path: 'edit/:id',
          component: () => import('../pages/equipment/EquipmentForm.vue'),
        },
      ],
    },
    {
      path: 'account',
      name: 'account',
      component: RouteViewComponent,
      children: [
        {
          name: 'account-management',
          path: 'account-management',
          component: () => import('../pages/admin/account/AccountManagePage.vue'),
        },
      ],
    },
    {
      name: 'order',
      path: 'order',
      component: RouteViewComponent,
      children: [
        {
          name: 'order-management',
          path: 'order-management',
          component: () => import('../pages/admin/order/OrderManagePage.vue'),
        },
        {
          name: 'order-list',
          path: 'order-list',
          component: () => import('../pages/admin/order/OrderListPage.vue'),
        },
      ],
    },
    {
      name: 'faq',
      path: 'faq',
      component: () => import('../pages/faq/FaqPage.vue'),
    },
    ],
  },
  {
    path: '/production',
    component: AuthLayout,
    children: [
      {
        name: 'login',
        path: 'login',
        component: () => import('../pages/auth/Login.vue'),
      },
      {
        name: 'signup',
        path: 'signup',
        component: () => import('../pages/auth/Signup.vue'),
      },
      {
        name: 'recover-password',
        path: 'recover-password',
        component: () => import('../pages/auth/RecoverPassword.vue'),
      },
      {
        name: 'recover-password-email',
        path: 'recover-password-email',
        component: () => import('../pages/auth/CheckTheEmail.vue'),
      },
      {
        path: '',
        redirect: { name: 'login' },
      },
    ],
  },
  {
    name: '404',
    path: '/404',
    component: () => import('../pages/404.vue'),
  },

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    // For some reason using documentation example doesn't scroll on page navigation.
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      window.scrollTo(0, 0)
    }
  },
  routes,
})

export default router
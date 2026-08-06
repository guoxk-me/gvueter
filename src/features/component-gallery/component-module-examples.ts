import type { Component } from 'vue'
import type { ComponentCenterModuleId } from './component-center-modules'
import { defineAsyncComponent } from 'vue'

export interface ComponentModuleExample {
  id: string
  titleKey: string
  component: Component
}

function defineDeferredExample(loader: () => Promise<{ default: Component }>): Component {
  return defineAsyncComponent({
    loader,
    delay: 200,
    timeout: 30_000,
  })
}

// AI modified: legacy examples remain reachable through a fixed local registry and load only inside their focused module.
export const componentModuleExamples: Partial<
  Record<ComponentCenterModuleId, readonly ComponentModuleExample[]>
> = {
  selection: [
    {
      id: 'discovery',
      titleKey: 'components.tabs.discovery',
      component: defineDeferredExample(() => import('./components/ComponentsDiscoveryDemo.vue')),
    },
    {
      id: 'hierarchy',
      titleKey: 'components.tabs.hierarchy',
      component: defineDeferredExample(() => import('./components/ComponentsHierarchyDemo.vue')),
    },
    {
      id: 'selection-display',
      titleKey: 'components.center.examples.selectionDisplay',
      component: defineDeferredExample(
        () => import('./components/ComponentsSelectionDisplayDemo.vue'),
      ),
    },
  ],
  editors: [
    {
      id: 'editors',
      titleKey: 'components.center.examples.editors',
      component: defineDeferredExample(
        () => import('./components/ComponentsSelectionDisplayDemo.vue'),
      ),
    },
  ],
  patterns: [
    {
      id: 'page-states',
      titleKey: 'components.center.examples.pageStates',
      component: defineDeferredExample(() => import('./components/PageStateGallery.vue')),
    },
    {
      id: 'data',
      titleKey: 'components.tabs.data',
      component: defineDeferredExample(() => import('./components/ComponentsDataDemo.vue')),
    },
    {
      id: 'feedback',
      titleKey: 'components.tabs.feedback',
      component: defineDeferredExample(() => import('./components/ComponentsFeedbackDemo.vue')),
    },
    {
      id: 'operations',
      titleKey: 'components.tabs.operations',
      component: defineDeferredExample(() => import('./components/ComponentsOperationsDemo.vue')),
    },
    {
      id: 'crud',
      titleKey: 'components.tabs.crud',
      component: defineDeferredExample(() => import('./components/ComponentsCrudDemo.vue')),
    },
    {
      id: 'workflow',
      titleKey: 'components.tabs.workflow',
      component: defineDeferredExample(() => import('./components/ComponentsWorkflowDemo.vue')),
    },
    {
      id: 'business',
      titleKey: 'components.tabs.business',
      component: defineDeferredExample(() => import('./components/ComponentsBusinessDemo.vue')),
    },
  ],
}

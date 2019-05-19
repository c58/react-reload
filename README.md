# React-Reload
React-Reload is a function that creates reusable async data loader component which can be used with or without Redux. That component helps you to load data from your server in a declarative way and keep it in sync with your global state.

[![build status](https://img.shields.io/travis/c58/react-reload/master.svg?style=flat-square)](https://travis-ci.org/c58/react-reload)
[![npm version](https://img.shields.io/npm/v/react-reload.svg?style=flat-square)](https://www.npmjs.com/package/react-reload)
[![npm downloads](https://img.shields.io/npm/dm/react-reload.svg?style=flat-square)](https://www.npmjs.com/package/react-reload)
[![Depfu](https://badges.depfu.com/badges/e230e170df549047de7eb008d0994743/overview.svg)](https://depfu.com/github/c58/react-reload?project_id=7965)

## Motivation
Most of the time, when you need to load some data from the backend, the following set of problems arises:
1. The data loading should be started when the page about to be showed (componentDidMount)
2. The data should be erased when the page is not showed anymore (componentWillUnmount)
3. When some parameters for the data retrieving changed, you need to load the data again and stop loading/ignore the data that is about to be received for the previous set of parameters (keep only latest results for the latest parameters)
4. If some error arise while the data loading, you need to properly handle it and extract some text from the error that can be showed to the user
5. And sometimes you need to have all that problems solved in a reusable way, to not solve them again for a particular case

As you can see, the data loading event originate in the React component lifecycle events. If we are going to solve these problems in a traditional way (redux thunk/sagas/pure react), we will have to create at least a few redux actions, make sure that the "take only latest" case handled properly, and also do not forget to erase the state/stop data loading when the page changed. And I can't even imagine how to make all of that in a reusable way.

So, that tool is going to help you to solve all the problems in one place and provide a nice interface to write any kind of data retrieving logic

## How to write a loader?
```js
import createDataLoder from 'react-reload'

export default createDataLoder(state => {
  // That function invoked any time a new data loading process initiated. You can
  // use it's scope to store some data around the loading process.
  // The `state` have all the context that you might want to use while loading
  // the data. For instance:
  //
  // `state.data` – is a currently active data object
  // `state.setData(someData)` – is a function to set the data, useful when you
  //                             are polling some data and want to update the
  //                             data as soon as something received
  // `state.options` – is an object with options passed to the loader component

  return {
    cleanup: () => {
      // That function called when another data loading process started (with
      // new set of options, for example), or when the data loader component
      // will be unmounted
    },
    loader: async () => {
      // Do any kind of data retrieving logic here, using `state.options` to
      // control the actual API call
      return Promise.resolve()
    },
    actions: {
      // If you want to provide some functions to manipulate with the data
      // in some way, then you will need to add custom action. Check below
      // how to trigger these actions.
      // There is one action always available: `retry`, to initiate a new data
      // loading cycle.
      someAction: () => {

      }
    }
  }
})
```

## How to use a loader without Redux? (non-controlled mode)
```js
import PriceUpdateData from './PriceUpdateData'

const SomeDeepComponent = () => {
  <div>
    <PriceUpdateData.Consumer>
      {({ state, actions }) => (
        <div>
          <h1>Some data: {state.data}</h1>
          <div>Loading: {`${state.loading}`}</div>
          <div>Error: {`${state.error}`}</div>
          <button onClick={actions.retry}>Retry</button>
        </div>
      )}
    </PriceUpdateData.Consumer>
  </div>
}

// That is a non-controlled mode of the loader, where the state stored
// in the React component's state of the loader
const Page = () => {
  <div>
    <PriceUpdateData.Loader options={{ currency: 'USD' }}>
      <SomeDeepComponent />
    </PriceUpdateData.Loader>
  </div>
}
```

## How to use a loader with Redux? (controlled mode)
```js
import { connect } from 'react-redux'
import * as pageActions from './actions'
import PriceUpdateData from './PriceUpdateData'

// That is a controlled mode of the loader, where the state stored outside
// of the loader component. It is activated when non-undefined `state` prop
// and `onStateUpdate` prop provided to the loader
const ConnectedPriceUpdateLoader = connect(
  state => ({
    state: state.priceUpdate,

    // You can also pass options from redux state if you like. Or you can pass them
    // in place where the connected loader is used just like in "without redux" example
    options: { currency: 'USD' }
  }),
  { onStateUpdate: pageActions.setPriceUpdate }
)(PriceUpdateData.Loader)

const Page = () => {
  <ConnectedPriceUpdateLoader>
    <SomeDeepComponent />
  </ConnectedPriceUpdateLoader>
}
```

## How to reload/refresh the data?
When `options` prop changed the data reloaded automatically. Data loader check
previous and new options object with `shallowEqual` on `componentDidUpdate`,
and if it is different, then it reload the data.

You can also re-load the data manually by the `retry` action (see "without Redux" usage example).

## How to combine two or more loaders?
```js
import PriceUpdateData from './PriceUpdateData'
import TripResearchData from './TripResearchData'

// Just use `render` prop to nest one loader to another and to make
// any dependencies between the loaded data
const CombinedLoader = (props) => (
  <TripResearchData.Loader>
    {({ state: tripState, actions: tripActions }) => (
      <PriceUpdateData.Loader options={{ currency: tripState.data?.currency }}>
        {({ state: priceState, actions: priceActions }) => {
          if (typeof props.children === 'function') {
            return props.children({
              state: { tripState, priceState },
              actions: { tripActions, priceActions },
            })
          }
          return props.children
        }}
      </PriceUpdateData.Loader>
    )}
  </TripResearchData.Loader>
)
```

## `shouldLoadData` prop
The Loader component expected to be used as a top level wrapper component
in your components tree. And sometimes children of the Loader component
need to be rendered but the options object to actually loaded the data by
the loader is not yet available. That might happen when you are nesting one
loader to another.

For example, take a look at the section "How to combine loaders". While the
`TripResearchData.Loader` is loading the data there is no valid `options` that
can be used by `PriceUpdateData.Loader` to load the pricing. But the children
of `PriceUpdateData.Loader` still need to be showed to show the loading status
of the `TripResearchData.Loader` loader. That is where `shouldLoadData` is used
to skip price data loading until all necessary things become available.

## Loader Props
| Name | Description | Default |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| children | React element or a function that should expect one argument object `{ state, actions }`.  |  |
| options | An object that will be used by an actual data loader function. Each time this object changes the loader component will initiate a new loading cycle | null |
| emptyOnUnmount | If true and the Loader component used in controlled mode, then in 60ms after unmount `onStateUpdate` function will  be called with an empty state object. | false |
| lazyReloadOnMount | If true then on mount it check the state passed with props and compare options from the state and from the props. If options are the same, then the Loader won't load the data again. Useful if you are keeping the loaded data in the global state and do not want to load the data again when the Loader mounted again. Kind of caching. | false |
| shouldLoadData | A function that decide should the data to be loaded  for a particular options object or not. If that function returns false for a new `options` object, then the `loader` won't be called (loading will be skipped). You can also rise an exception here if your loader require some options to be always passed. | (options) => true |

## `createDataLoader` second argument
`createDataLoader` function have a second argument, which is an object with options.

| Name | Description | Default |
|-----------------------|--------------------------------------------------------------------------------------------------------|----------------------------------------------------------|
| displayName | A name of the data loader component | Data |
| defaultShouldLoadData | Default function that decide should the data to be loaded for a particular options object | `(options) => true` |
| optionsComparator | A function that will be used to detect a change in the `options` object passed to the loader component | (prevOpts, nextOpts) => shallowEqual(prevOpts, nextOpts) |
| errorNormalizer | A function that will be used to normalize an error returned by the loader. The result will be stored in `state.error` | `(error) => error?.message || 'Unknown error'` |

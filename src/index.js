import * as React from 'react'
import shallowEqual from 'shallowequal'
import createReactContext from 'create-react-context'

// Utils
let defaultErrorNormalizer = e => e?.message || 'Unknown error'

let defaultOptionsComparator = shallowEqual

const isFunc = f => typeof f === 'function'

const isPromise = p => p && isFunc(p.then)

const EMPTY_DATA_STATE = {
  data: null,
  loading: true,
  error: null,
  rawError: null,
  loadedOnce: false,
  options: {}
}

/**
 * Provide a way to set default error normalization function
 * that will be used if no specific one provided in the loader
 * @param {Function} normalizer
 */
export const setDefaultErrorNormalizer = normalizer =>
  (defaultErrorNormalizer = normalizer)

/**
 * Provide a way to set default options comparator function
 * that will be used if no specific one provided in the loader
 * @param {Function} normalizer
 */
export const setDefaultOptionsComparator = comparator =>
  (defaultOptionsComparator = comparator)

/**
 * A helper logic component that handle data loading on mount of the component.
 * It notify about state changes using render prop and provided handelr functions.
 */
export function createDataLoader(createParts, createOptions) {
  const optionsComparator =
    createOptions?.optionsComparator || defaultOptionsComparator
  const errorNormalizer =
    createOptions?.errorNormalizer || defaultErrorNormalizer

  const DataContext = createReactContext({
    state: EMPTY_DATA_STATE,
    actions: {}
  })

  class DataLoader extends React.Component {
    static displayName = `${createOptions?.displayName || 'Data'}.Loader`

    unmounted = false

    iteration = 0

    parts: *

    constructor(props: Props) {
      super(props)
      this.incrementIteration()
      this.state = {
        ...EMPTY_DATA_STATE,
        ...props.state,
        options: props.options
      }
    }

    get isStateControlled() {
      return this.props.state !== undefined && this.props.onStateUpdate
    }

    get activeState() {
      return this.isStateControlled
        ? this.props.state || this.state
        : this.state
    }

    componentWillUnmount() {
      this.unmounted = true
      this.iteration = -1
      this.cleanupActiveParts()

      const { onStateUpdate, emptyOnUnmount } = this.props
      const { activeState } = this

      if (emptyOnUnmount && onStateUpdate) {
        // Empty the state usually needed when the user left the page
        // so state for the previos page is not needed anymore. To avoid
        // any kind of flickering of the previous page, empty the state in
        // a little delay
        setTimeout(() => {
          onStateUpdate({
            ...activeState,
            ...EMPTY_DATA_STATE
          })
        }, 60)
      }
    }

    componentDidMount() {
      const { activeState } = this

      if (
        !this.props.lazyReloadOnMount ||
        !activeState.loadedOnce ||
        activeState.loading ||
        !optionsComparator(activeState.options, this.props.options)
      ) {
        this.doLoadData(this.iteration)
      }
    }

    componentDidUpdate(prevProps: Props) {
      if (!optionsComparator(prevProps.options, this.props.options)) {
        this.loadNextData()
      }
    }

    cleanupActiveParts() {
      if (this.parts && this.parts.cleanup) {
        this.parts.cleanup()
      }
    }

    incrementIteration() {
      const iteration = ++this.iteration
      const self = this
      const currentOptions = self.props.options
      const immutableState = {
        setData(data) {
          if (iteration === self.iteration) {
            self.setStateWithNotify({ data })
          }
        },
        retry() {
          if (iteration === self.iteration) {
            self.loadNextData()
          }
        },
        get iteration() {
          return iteration
        },
        get destroyed() {
          return iteration !== self.iteration
        },
        get data() {
          return self.activeState.data
        },
        get options() {
          return currentOptions
        },
        get loading() {
          return self.activeState.loading
        },
        get error() {
          return self.activeState.error
        },
        get rawError() {
          return self.activeState.rawError
        },
        get loadedOnce() {
          return self.activeState.loadedOnce
        }
      }

      this.cleanupActiveParts()
      this.parts = createParts(immutableState)
    }

    loadNextData = () => {
      this.incrementIteration()
      this.doLoadData(this.iteration)
    }

    shouldLoadData() {
      const shouldLoadData =
        this.props.shouldLoadData || createOptions?.defaultShouldLoadData
      return shouldLoadData ? !!shouldLoadData(this.props.options) : true
    }

    async doLoadData(iteration) {
      try {
        if (!this.shouldLoadData()) return
        const rawResult = this.parts.loader()

        if (isPromise(rawResult)) {
          this.setStateWithNotify({
            options: this.props.options,
            loading: true,
            error: null,
            rawError: null
          })
          const resolvedResult = await rawResult
          if (iteration === this.iteration) {
            this.handleDataLoaded(resolvedResult)
          }
        } else {
          this.handleDataLoaded(rawResult)
        }
      } catch (e) {
        if (iteration === this.iteration) {
          this.handleErrorWhileLoading(e)
        }
      }
    }

    setStateWithNotify(updateState: *) {
      if (this.unmounted) return

      if (this.isStateControlled) {
        if (this.props.onStateUpdate) {
          this.props.onStateUpdate({
            ...this.activeState,
            ...updateState
          })
        }
      } else {
        this.setState(updateState, () => {
          if (!this.unmounted && this.props.onStateUpdate) {
            this.props.onStateUpdate(this.activeState)
          }
        })
      }
    }

    handleErrorWhileLoading(error: *) {
      if (this.unmounted) return
      const normError = errorNormalizer(error)

      this.setStateWithNotify({
        options: this.props.options,
        loading: false,
        loadedOnce: true,
        error: normError,
        rawError: error
      })
    }

    handleDataLoaded(data: *) {
      if (this.unmounted) return

      this.setStateWithNotify({
        options: this.props.options,
        loading: false,
        loadedOnce: true,
        error: null,
        rawError: null,
        data
      })
    }

    render() {
      const actualActions = {
        retry: this.loadNextData,
        ...this.parts.actions
      }
      const contextValue = {
        state: this.activeState,
        actions: actualActions
      }
      const content =
        typeof this.props.children === 'function'
          ? this.props.children(contextValue)
          : this.props.children

      return (
        <DataContext.Provider value={contextValue}>
          {content}
        </DataContext.Provider>
      )
    }
  }

  DataContext.Loader = DataLoader
  DataContext.Factory = createParts
  return DataContext
}

export default createDataLoader

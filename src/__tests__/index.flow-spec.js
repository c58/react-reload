// @flow
import * as React from 'react'
import createLoader from '../'

type Data = {
  a: boolean,
  b: string
}
type Options = {
  c: string,
  d: number
}
type Actions = {
  anotherAction: () => string
}

const Loader = createLoader<Data, Options, Actions>(state => ({
  loader: () => {
    const a = Math.random()
    if (a > 0.5) {
      // $FlowExpectError
      return 'asd'
    } else if (a > 0.6) {
      return null
    }

    // $FlowExpectError
    const cError = state.options.asd
    // $FlowExpectError
    const dError: boolean = state.options.d

    // $FlowExpectError
    state.setData({ a: '123' })
    state.setData({ a: true, b: '123' })

    const { c } = state.options
    return Promise.resolve({
      a: !!c,
      b: 'asd'
    })
  },
  actions: {
    anotherAction() {
      return 'test'
    }
  }
}))

const renderFunc = ({ state, actions }) => {
  actions.retry()
  const actionRes = actions.anotherAction()
  const dataComp = state.data?.b

  // $FlowExpectError
  const actionBadRes: number = actions.anotherAction()
  // $FlowExpectError
  const unknownOne = state.hbksjhb
  // $FlowExpectError
  const unknownTwo = state.data.adsd

  return null
}

const ConsumerElement = <Loader.Consumer>{renderFunc}</Loader.Consumer>

const LoaderPassElement = (
  <Loader.Loader>
    <div />
  </Loader.Loader>
)

const LoaderFunctionElement = <Loader.Loader>{renderFunc}</Loader.Loader>

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../Button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading spinner when loading prop is true', () => {
    render(<Button loading>Loading button</Button>)
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText('Loading button')).not.toBeInTheDocument()
  })

  it('disables button when loading', () => {
    render(<Button loading>Loading button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('applies variant prop correctly', () => {
    render(<Button variant="outlined">Outlined button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('MuiButton-outlined')
  })

  it('applies color prop correctly', () => {
    render(<Button color="primary">Primary button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('MuiButton-colorPrimary')
  })

  it('applies size prop correctly', () => {
    render(<Button size="large">Large button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('MuiButton-sizeLarge')
  })

  it('supports fullWidth prop', () => {
    render(<Button fullWidth>Full width button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('MuiButton-fullWidth')
  })

  it('prevents click when loading', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(
      <Button loading onClick={handleClick}>
        Loading button
      </Button>
    )
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('combines disabled and loading states correctly', () => {
    render(
      <Button disabled loading>
        Button
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('passes through additional props to MUI Button', () => {
    render(
      <Button data-testid="custom-button" className="custom-class">
        Button
      </Button>
    )
    
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveClass('custom-class')
  })
})